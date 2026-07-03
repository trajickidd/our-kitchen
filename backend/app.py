import os
import re
import json
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from bs4 import BeautifulSoup
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": "*"
    }
})

basedir = os.path.abspath(os.path.dirname(__file__))
database_url = os.environ.get('DATABASE_URL')
if database_url:
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'our_kitchen.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}

db = SQLAlchemy(app)

# ─── Models ───────────────────────────────────────────────────────────────────

class Profile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    allergens = db.Column(db.JSON, default=list)  # e.g. ["gluten", "lactose"]
    macro_priority = db.Column(db.JSON, default=list)  # e.g. ["carbs", "sugar"] or ["calories", "protein"]

class FoodItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    brand = db.Column(db.String(100))
    barcode = db.Column(db.String(50))
    calories_per100 = db.Column(db.Float, default=0)
    carbs_per100 = db.Column(db.Float, default=0)
    sugar_per100 = db.Column(db.Float, default=0)
    protein_per100 = db.Column(db.Float, default=0)
    fat_per100 = db.Column(db.Float, default=0)
    fibre_per100 = db.Column(db.Float, default=0)
    allergens = db.Column(db.JSON, default=list)  # ["gluten", "lactose", "nuts" ...]
    source = db.Column(db.String(20), default='openfoodfacts')  # openfoodfacts | manual
    off_id = db.Column(db.String(100))
    is_custom = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'brand': self.brand,
            'barcode': self.barcode,
            'calories_per100': self.calories_per100,
            'carbs_per100': self.carbs_per100,
            'sugar_per100': self.sugar_per100,
            'protein_per100': self.protein_per100,
            'fat_per100': self.fat_per100,
            'fibre_per100': self.fibre_per100,
            'allergens': self.allergens or [],
            'source': self.source,
            'is_custom': self.is_custom,
        }

class Recipe(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    source_type = db.Column(db.String(20), default='manual')  # url | youtube | tiktok | manual | voice
    source_url = db.Column(db.String(500))
    image_url = db.Column(db.String(500))
    image_local = db.Column(db.String(200))
    cuisine = db.Column(db.String(100))
    difficulty = db.Column(db.String(20))
    cook_time_mins = db.Column(db.Integer)
    base_portions = db.Column(db.Integer, default=4)
    tags = db.Column(db.JSON, default=list)
    notes = db.Column(db.Text)
    is_favourite = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ingredients = db.relationship('RecipeIngredient', backref='recipe', lazy=True, cascade='all, delete-orphan')

    def to_dict(self, include_ingredients=True):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'source_type': self.source_type,
            'source_url': self.source_url,
            'image_url': self.image_url,
            'cuisine': self.cuisine,
            'difficulty': self.difficulty,
            'cook_time_mins': self.cook_time_mins,
            'base_portions': self.base_portions,
            'tags': self.tags or [],
            'notes': self.notes,
            'is_favourite': self.is_favourite or False,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_ingredients:
            data['ingredients'] = [i.to_dict() for i in sorted(self.ingredients, key=lambda x: x.order)]
        return data

class RecipeIngredient(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    recipe_id = db.Column(db.Integer, db.ForeignKey('recipe.id'), nullable=False)
    food_item_id = db.Column(db.Integer, db.ForeignKey('food_item.id'))
    name = db.Column(db.String(200), nullable=False)  # display name, even if no food_item linked
    quantity = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), default='g')  # g | ml | tsp | tbsp | whole | cup
    order = db.Column(db.Integer, default=0)
    food_item = db.relationship('FoodItem', lazy=True)

    def to_dict(self):
        macros = {}
        allergens = []
        if self.food_item and self.quantity:
            factor = self.quantity / 100.0
            macros = {
                'calories': round(self.food_item.calories_per100 * factor, 1),
                'carbs': round(self.food_item.carbs_per100 * factor, 1),
                'sugar': round(self.food_item.sugar_per100 * factor, 1),
                'protein': round(self.food_item.protein_per100 * factor, 1),
                'fat': round(self.food_item.fat_per100 * factor, 1),
            }
            allergens = self.food_item.allergens or []
        return {
            'id': self.id,
            'recipe_id': self.recipe_id,
            'food_item_id': self.food_item_id,
            'name': self.name,
            'quantity': self.quantity,
            'unit': self.unit,
            'order': self.order,
            'macros': macros,
            'allergens': allergens,
        }

# ─── Helpers ──────────────────────────────────────────────────────────────────

def calculate_recipe_macros(recipe, portions_override=None):
    portions = portions_override or recipe.base_portions
    totals = {'calories': 0, 'carbs': 0, 'sugar': 0, 'protein': 0, 'fat': 0}
    for ing in recipe.ingredients:
        if ing.food_item and ing.quantity:
            factor = ing.quantity / 100.0
            totals['calories'] += ing.food_item.calories_per100 * factor
            totals['carbs'] += ing.food_item.carbs_per100 * factor
            totals['sugar'] += ing.food_item.sugar_per100 * factor
            totals['protein'] += ing.food_item.protein_per100 * factor
            totals['fat'] += ing.food_item.fat_per100 * factor
    per_portion = {k: round(v / portions, 1) for k, v in totals.items()}
    return {'total': {k: round(v, 1) for k, v in totals.items()}, 'per_portion': per_portion}

def detect_allergens_in_name(name):
    name_lower = name.lower()
    allergens = []
    gluten_keywords = ['wheat', 'flour', 'pasta', 'spaghetti', 'noodle', 'bread', 'soy sauce',
                       'ramen', 'udon', 'couscous', 'barley', 'rye', 'semolina', 'bulgur']
    lactose_keywords = ['milk', 'cream', 'butter', 'cheese', 'yogurt', 'yoghurt', 'pecorino',
                        'parmesan', 'mozzarella', 'cheddar', 'ricotta', 'brie', 'feta', 'dairy',
                        'whey', 'lactose', 'ghee', 'creme fraiche', 'crème fraîche']
    if any(k in name_lower for k in gluten_keywords):
        allergens.append('gluten')
    if any(k in name_lower for k in lactose_keywords):
        allergens.append('lactose')
    return allergens

def search_open_food_facts(query, limit=10):
    try:
        url = f"https://world.openfoodfacts.org/cgi/search.pl"
        params = {
            'search_terms': query,
            'search_simple': 1,
            'action': 'process',
            'json': 1,
            'page_size': limit,
            'fields': 'id,product_name,brands,nutriments,allergens_tags,code'
        }
        r = requests.get(url, params=params, timeout=8)
        products = r.json().get('products', [])
        results = []
        for p in products:
            n = p.get('nutriments', {})
            name = p.get('product_name', '').strip()
            if not name:
                continue
            allergens = []
            atags = p.get('allergens_tags', [])
            if any('gluten' in t for t in atags):
                allergens.append('gluten')
            if any('milk' in t for t in atags):
                allergens.append('lactose')
            if any('nut' in t for t in atags):
                allergens.append('nuts')
            if any('egg' in t for t in atags):
                allergens.append('eggs')
            results.append({
                'off_id': p.get('code', p.get('id', '')),
                'name': name,
                'brand': p.get('brands', '').split(',')[0].strip() if p.get('brands') else None,
                'calories_per100': round(n.get('energy-kcal_100g', 0) or 0, 1),
                'carbs_per100': round(n.get('carbohydrates_100g', 0) or 0, 1),
                'sugar_per100': round(n.get('sugars_100g', 0) or 0, 1),
                'protein_per100': round(n.get('proteins_100g', 0) or 0, 1),
                'fat_per100': round(n.get('fat_100g', 0) or 0, 1),
                'fibre_per100': round(n.get('fiber_100g', 0) or 0, 1),
                'allergens': allergens,
            })
        return results
    except Exception as e:
        return []

def fetch_by_barcode(barcode):
    try:
        r = requests.get(f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json", timeout=8)
        data = r.json()
        if data.get('status') != 1:
            return None
        p = data['product']
        n = p.get('nutriments', {})
        allergens = []
        atags = p.get('allergens_tags', [])
        if any('gluten' in t for t in atags): allergens.append('gluten')
        if any('milk' in t for t in atags): allergens.append('lactose')
        if any('nut' in t for t in atags): allergens.append('nuts')
        return {
            'off_id': barcode,
            'name': p.get('product_name', '').strip(),
            'brand': p.get('brands', '').split(',')[0].strip() if p.get('brands') else None,
            'calories_per100': round(n.get('energy-kcal_100g', 0) or 0, 1),
            'carbs_per100': round(n.get('carbohydrates_100g', 0) or 0, 1),
            'sugar_per100': round(n.get('sugars_100g', 0) or 0, 1),
            'protein_per100': round(n.get('proteins_100g', 0) or 0, 1),
            'fat_per100': round(n.get('fat_100g', 0) or 0, 1),
            'fibre_per100': round(n.get('fiber_100g', 0) or 0, 1),
            'allergens': allergens,
        }
    except:
        return None

def scrape_recipe_from_url(url):
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; OurKitchenApp/1.0)'}
        r = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(r.text, 'html.parser')

        # og:image
        og_image = None
        og = soup.find('meta', property='og:image')
        if og:
            og_image = og.get('content')

        # Try JSON-LD schema.org/Recipe first
        recipe_data = {}
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string or '{}')
                if isinstance(data, list):
                    data = next((d for d in data if d.get('@type') == 'Recipe'), {})
                if data.get('@type') == 'Recipe':
                    recipe_data = data
                    break
            except:
                continue

        result = {
            'title': recipe_data.get('name', soup.title.string if soup.title else ''),
            'description': recipe_data.get('description', ''),
            'image_url': og_image or (recipe_data.get('image', [None])[0] if isinstance(recipe_data.get('image'), list) else recipe_data.get('image')),
            'cook_time_mins': None,
            'base_portions': None,
            'ingredients_raw': [],
            'method_raw': [],
        }

        # Cook time
        total_time = recipe_data.get('totalTime') or recipe_data.get('cookTime', '')
        if total_time:
            m = re.search(r'PT(\d+)M', total_time)
            if m:
                result['cook_time_mins'] = int(m.group(1))

        # Portions
        yield_data = recipe_data.get('recipeYield')
        if yield_data:
            nums = re.findall(r'\d+', str(yield_data))
            if nums:
                result['base_portions'] = int(nums[0])

        # Ingredients
        if recipe_data.get('recipeIngredient'):
            result['ingredients_raw'] = recipe_data['recipeIngredient']

        # Method
        instructions = recipe_data.get('recipeInstructions', [])
        if isinstance(instructions, list):
            for step in instructions:
                if isinstance(step, dict):
                    result['method_raw'].append(step.get('text', ''))
                else:
                    result['method_raw'].append(str(step))
        elif isinstance(instructions, str):
            result['method_raw'] = [instructions]

        return result
    except Exception as e:
        return {'error': str(e)}

def get_youtube_thumbnail(url):
    vid_id = None
    patterns = [
        r'youtube\.com/watch\?v=([^&]+)',
        r'youtu\.be/([^?]+)',
        r'youtube\.com/embed/([^?]+)',
    ]
    for pattern in patterns:
        m = re.search(pattern, url)
        if m:
            vid_id = m.group(1)
            break
    if not vid_id:
        return None, None
    thumbnail = f"https://img.youtube.com/vi/{vid_id}/maxresdefault.jpg"
    return vid_id, thumbnail

def get_tiktok_thumbnail(url):
    try:
        r = requests.get(f"https://www.tiktok.com/oembed?url={url}", timeout=8)
        data = r.json()
        return data.get('thumbnail_url'), data.get('title', '')
    except:
        return None, ''

# ─── Profile Routes ───────────────────────────────────────────────────────────

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    profiles = Profile.query.all()
    return jsonify([{
        'id': p.id, 'name': p.name,
        'allergens': p.allergens or [],
        'macro_priority': p.macro_priority or []
    } for p in profiles])

@app.route('/api/profiles', methods=['POST'])
def create_profile():
    data = request.json
    p = Profile(
        name=data['name'],
        allergens=data.get('allergens', []),
        macro_priority=data.get('macro_priority', [])
    )
    db.session.add(p)
    db.session.commit()
    return jsonify({'id': p.id, 'name': p.name, 'allergens': p.allergens, 'macro_priority': p.macro_priority}), 201

@app.route('/api/profiles/<int:pid>', methods=['PUT'])
def update_profile(pid):
    p = Profile.query.get_or_404(pid)
    data = request.json
    if 'name' in data: p.name = data['name']
    if 'allergens' in data: p.allergens = data['allergens']
    if 'macro_priority' in data: p.macro_priority = data['macro_priority']
    db.session.commit()
    return jsonify({'id': p.id, 'name': p.name, 'allergens': p.allergens, 'macro_priority': p.macro_priority})

# ─── Food Item / Ingredient Library Routes ────────────────────────────────────

@app.route('/api/food/search', methods=['GET'])
def search_food():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])
    # Search local custom items first
    local = FoodItem.query.filter(
        FoodItem.name.ilike(f'%{query}%')
    ).limit(5).all()
    local_results = [f.to_dict() for f in local]
    # Then Open Food Facts
    off_results = search_open_food_facts(query, limit=8)
    # Deduplicate by name+brand
    seen = {(f['name'].lower(), (f.get('brand') or '').lower()) for f in local_results}
    deduped_off = []
    for r in off_results:
        key = (r['name'].lower(), (r.get('brand') or '').lower())
        if key not in seen:
            seen.add(key)
            deduped_off.append(r)
    return jsonify({'local': local_results, 'off': deduped_off})

@app.route('/api/food/barcode/<barcode>', methods=['GET'])
def lookup_barcode(barcode):
    # Check local first
    local = FoodItem.query.filter_by(barcode=barcode).first()
    if local:
        return jsonify({'source': 'local', 'item': local.to_dict()})
    result = fetch_by_barcode(barcode)
    if not result:
        return jsonify({'error': 'Product not found'}), 404
    return jsonify({'source': 'openfoodfacts', 'item': result})

@app.route('/api/food/custom', methods=['POST'])
def create_custom_food():
    data = request.json
    allergens = data.get('allergens', []) or detect_allergens_in_name(data.get('name', ''))
    item = FoodItem(
        name=data['name'],
        brand=data.get('brand'),
        barcode=data.get('barcode'),
        calories_per100=data.get('calories_per100', 0),
        carbs_per100=data.get('carbs_per100', 0),
        sugar_per100=data.get('sugar_per100', 0),
        protein_per100=data.get('protein_per100', 0),
        fat_per100=data.get('fat_per100', 0),
        fibre_per100=data.get('fibre_per100', 0),
        allergens=allergens,
        source='manual',
        is_custom=True,
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/food/save-off', methods=['POST'])
def save_off_item():
    """Save an Open Food Facts result to local DB for future use"""
    data = request.json
    existing = FoodItem.query.filter_by(off_id=data.get('off_id')).first()
    if existing:
        return jsonify(existing.to_dict())
    item = FoodItem(
        name=data['name'],
        brand=data.get('brand'),
        barcode=data.get('off_id'),
        off_id=data.get('off_id'),
        calories_per100=data.get('calories_per100', 0),
        carbs_per100=data.get('carbs_per100', 0),
        sugar_per100=data.get('sugar_per100', 0),
        protein_per100=data.get('protein_per100', 0),
        fat_per100=data.get('fat_per100', 0),
        fibre_per100=data.get('fibre_per100', 0),
        allergens=data.get('allergens', []),
        source='openfoodfacts',
    )
    db.session.add(item)
    db.session.commit()
    return jsonify(item.to_dict()), 201

# ─── Recipe Routes ─────────────────────────────────────────────────────────────

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    tag = request.args.get('tag')
    query = Recipe.query
    if tag:
        query = query.filter(Recipe.tags.contains([tag]))
    recipes = query.order_by(Recipe.created_at.desc()).all()
    result = []
    for r in recipes:
        d = r.to_dict(include_ingredients=False)
        d['macros'] = calculate_recipe_macros(r)
        d['allergens'] = list({a for ing in r.ingredients for a in (ing.food_item.allergens if ing.food_item else detect_allergens_in_name(ing.name))})
        result.append(d)
    return jsonify(result)

@app.route('/api/recipes/<int:rid>', methods=['GET'])
def get_recipe(rid):
    portions = request.args.get('portions', type=int)
    r = Recipe.query.get_or_404(rid)
    data = r.to_dict()
    data['macros'] = calculate_recipe_macros(r, portions)
    data['allergens'] = list({a for ing in r.ingredients for a in (ing.food_item.allergens if ing.food_item else detect_allergens_in_name(ing.name))})
    return jsonify(data)

@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    data = request.json
    recipe = Recipe(
        title=data['title'],
        description=data.get('description', ''),
        source_type=data.get('source_type', 'manual'),
        source_url=data.get('source_url'),
        image_url=data.get('image_url'),
        cuisine=data.get('cuisine'),
        difficulty=data.get('difficulty'),
        cook_time_mins=data.get('cook_time_mins'),
        base_portions=data.get('base_portions', 4),
        tags=data.get('tags', []),
        notes=data.get('notes'),
    )
    db.session.add(recipe)
    db.session.flush()

    for i, ing_data in enumerate(data.get('ingredients', [])):
        food_item_id = ing_data.get('food_item_id')
        # If off result passed inline, save it first
        if not food_item_id and ing_data.get('off_id'):
            existing = FoodItem.query.filter_by(off_id=ing_data['off_id']).first()
            if existing:
                food_item_id = existing.id
            else:
                item = FoodItem(
                    name=ing_data['name'],
                    brand=ing_data.get('brand'),
                    off_id=ing_data['off_id'],
                    calories_per100=ing_data.get('calories_per100', 0),
                    carbs_per100=ing_data.get('carbs_per100', 0),
                    sugar_per100=ing_data.get('sugar_per100', 0),
                    protein_per100=ing_data.get('protein_per100', 0),
                    fat_per100=ing_data.get('fat_per100', 0),
                    allergens=ing_data.get('allergens', []) or detect_allergens_in_name(ing_data['name']),
                    source='openfoodfacts',
                )
                db.session.add(item)
                db.session.flush()
                food_item_id = item.id

        ingredient = RecipeIngredient(
            recipe_id=recipe.id,
            food_item_id=food_item_id,
            name=ing_data['name'],
            quantity=ing_data.get('quantity', 0),
            unit=ing_data.get('unit', 'g'),
            order=i,
        )
        db.session.add(ingredient)

    db.session.commit()
    data = recipe.to_dict()
    data['macros'] = calculate_recipe_macros(recipe)
    return jsonify(data), 201

@app.route('/api/recipes/<int:rid>', methods=['PUT'])
def update_recipe(rid):
    recipe = Recipe.query.get_or_404(rid)
    data = request.json
    for field in ['title', 'description', 'source_type', 'source_url', 'image_url',
                  'cuisine', 'difficulty', 'cook_time_mins', 'base_portions', 'tags', 'notes']:
        if field in data:
            setattr(recipe, field, data[field])
    recipe.updated_at = datetime.utcnow()

    if 'ingredients' in data:
        RecipeIngredient.query.filter_by(recipe_id=rid).delete()
        for i, ing_data in enumerate(data['ingredients']):
            food_item_id = ing_data.get('food_item_id')
            ingredient = RecipeIngredient(
                recipe_id=recipe.id,
                food_item_id=food_item_id,
                name=ing_data['name'],
                quantity=ing_data.get('quantity', 0),
                unit=ing_data.get('unit', 'g'),
                order=i,
            )
            db.session.add(ingredient)

    db.session.commit()
    data = recipe.to_dict()
    data['macros'] = calculate_recipe_macros(recipe)
    return jsonify(data)

@app.route('/api/recipes/<int:rid>', methods=['DELETE'])
def delete_recipe(rid):
    recipe = Recipe.query.get_or_404(rid)
    db.session.delete(recipe)
    db.session.commit()
    return jsonify({'deleted': True})

@app.route('/api/recipes/<int:rid>/macros', methods=['GET'])
def get_recipe_macros(rid):
    portions = request.args.get('portions', type=int)
    recipe = Recipe.query.get_or_404(rid)
    return jsonify(calculate_recipe_macros(recipe, portions))

# ─── Import Routes ─────────────────────────────────────────────────────────────

@app.route('/api/import/url', methods=['POST'])
def import_from_url():
    url = request.json.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400
    scraped = scrape_recipe_from_url(url)
    if 'error' in scraped:
        return jsonify({'error': scraped['error']}), 400

    # Try Claude API to parse/clean up if available
    claude_result = None
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if api_key and scraped.get('ingredients_raw'):
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""Parse this recipe data and return clean JSON only, no markdown.
Title: {scraped.get('title', '')}
Ingredients raw: {json.dumps(scraped.get('ingredients_raw', []))}
Method raw: {json.dumps(scraped.get('method_raw', []))}

Return JSON with:
- title (string)
- description (string, 1-2 sentences)
- cuisine (string, e.g. Italian)
- difficulty (Easy/Medium/Hard)
- ingredients: array of {{name, quantity (number), unit (g/ml/tsp/tbsp/whole/cup)}}
- method: array of step strings
- tags: array of relevant tags from [breakfast, lunch, dinner, snack, high-protein, low-carb, vegetarian, vegan, quick, meal-prep, diabetic-friendly]"""

            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = msg.content[0].text.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'```$', '', raw).strip()
            claude_result = json.loads(raw)
        except Exception as e:
            pass

    return jsonify({
        'scraped': scraped,
        'claude': claude_result,
        'source_url': url,
        'source_type': 'url',
    })

@app.route('/api/import/youtube', methods=['POST'])
def import_from_youtube():
    url = request.json.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400

    vid_id, thumbnail = get_youtube_thumbnail(url)
    if not vid_id:
        return jsonify({'error': 'Could not extract video ID from URL'}), 400

    # Get transcript
    transcript_text = ''
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        transcript = YouTubeTranscriptApi.get_transcript(vid_id, languages=['en', 'en-GB', 'en-US'])
        transcript_text = ' '.join([t['text'] for t in transcript])
    except Exception as e:
        return jsonify({'error': f'Could not get transcript: {str(e)}', 'thumbnail': thumbnail, 'video_id': vid_id}), 400

    # Parse with Claude
    claude_result = None
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if api_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            prompt = f"""This is a transcript from a cooking YouTube video. Extract the recipe and return clean JSON only, no markdown.

Transcript: {transcript_text[:4000]}

Return JSON with:
- title (string)
- description (string, 1-2 sentences)
- cuisine (string)
- difficulty (Easy/Medium/Hard)
- cook_time_mins (number or null)
- base_portions (number or null)
- ingredients: array of {{name, quantity (number), unit (g/ml/tsp/tbsp/whole/cup/pinch)}}
- method: array of step strings
- tags: array from [breakfast, lunch, dinner, snack, high-protein, low-carb, vegetarian, vegan, quick, meal-prep, diabetic-friendly]

If something is unclear, make a sensible estimate. Focus on accuracy of ingredients and quantities."""

            msg = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )
            raw = msg.content[0].text.strip()
            raw = re.sub(r'^```json\s*', '', raw)
            raw = re.sub(r'```$', '', raw).strip()
            claude_result = json.loads(raw)
        except Exception as e:
            return jsonify({'error': f'Claude parsing failed: {str(e)}'}), 500

    return jsonify({
        'claude': claude_result,
        'thumbnail': thumbnail,
        'video_id': vid_id,
        'source_url': url,
        'source_type': 'youtube',
    })

@app.route('/api/import/tiktok', methods=['POST'])
def import_from_tiktok():
    url = request.json.get('url', '').strip()
    if not url:
        return jsonify({'error': 'URL required'}), 400
    thumbnail, title = get_tiktok_thumbnail(url)
    return jsonify({
        'thumbnail': thumbnail,
        'title': title,
        'source_url': url,
        'source_type': 'tiktok',
    })

@app.route('/api/import/voice', methods=['POST'])
def import_from_voice():
    """Parse a voice transcript into a structured recipe via Claude"""
    transcript = request.json.get('transcript', '').strip()
    if not transcript:
        return jsonify({'error': 'Transcript required'}), 400
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        return jsonify({'error': 'Claude API not configured'}), 503
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        prompt = f"""The user has spoken a recipe aloud. Parse it and return clean JSON only, no markdown.

Spoken text: "{transcript}"

Return JSON with:
- title (string, infer if not stated)
- description (string)
- cuisine (string or null)
- difficulty (Easy/Medium/Hard)
- cook_time_mins (number or null)
- base_portions (number or null, default 2)
- ingredients: array of {{name, quantity (number), unit (g/ml/tsp/tbsp/whole/cup/pinch)}}
- method: array of step strings
- tags: array from [breakfast, lunch, dinner, snack, high-protein, low-carb, vegetarian, vegan, quick, meal-prep, diabetic-friendly]"""

        msg = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )
        raw = msg.content[0].text.strip()
        raw = re.sub(r'^```json\s*', '', raw)
        raw = re.sub(r'```$', '', raw).strip()
        result = json.loads(raw)
        return jsonify({'claude': result, 'source_type': 'voice'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ─── Favourite toggle ─────────────────────────────────────────────────────────

@app.route('/api/recipes/<int:rid>/favourite', methods=['POST'])
def toggle_favourite(rid):
    recipe = Recipe.query.get_or_404(rid)
    recipe.is_favourite = not (recipe.is_favourite or False)
    db.session.commit()
    return jsonify({'is_favourite': recipe.is_favourite})

# ─── Parse raw ingredient strings ─────────────────────────────────────────────

@app.route('/api/parse-ingredients', methods=['POST'])
def parse_ingredients():
    import re
    raw_list = request.json.get('ingredients', [])
    UNITS = ['g', 'kg', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'cups', 'oz', 'lb',
             'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons', 'litre', 'litres',
             'liter', 'liters', 'gram', 'grams', 'kilogram', 'kilograms',
             'milliliter', 'milliliters', 'ounce', 'ounces', 'pound', 'pounds',
             'handful', 'handfuls', 'bunch', 'pinch', 'clove', 'cloves', 'slice', 'slices',
             'can', 'cans', 'tin', 'tins', 'jar', 'jars', 'piece', 'pieces']
    UNIT_MAP = {
        'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
        'cups': 'cup', 'litre': 'l', 'litres': 'l', 'liter': 'l', 'liters': 'l',
        'gram': 'g', 'grams': 'g', 'kilogram': 'kg', 'kilograms': 'kg',
        'milliliter': 'ml', 'milliliters': 'ml', 'ounce': 'oz', 'ounces': 'oz',
        'pound': 'lb', 'pounds': 'lb', 'cloves': 'whole', 'clove': 'whole',
        'handful': 'whole', 'handfuls': 'whole', 'bunch': 'whole', 'pinch': 'pinch',
        'slice': 'whole', 'slices': 'whole', 'can': 'whole', 'cans': 'whole',
        'tin': 'whole', 'tins': 'whole', 'jar': 'whole', 'jars': 'whole',
        'piece': 'whole', 'pieces': 'whole',
    }
    parsed = []
    for raw in raw_list:
        if not raw or not raw.strip():
            continue
        text = raw.strip()
        # Remove parenthetical notes
        text = re.sub(r'\([^)]*\)', '', text).strip()
        qty = 0
        unit = 'whole'
        name = text
        # Match number (including fractions like 1/2)
        m = re.match(r'^(\d+(?:[\./]\d+)?(?:\s+\d+/\d+)?)\s*(.*)', text)
        if m:
            qty_str = m.group(1).strip()
            remainder = m.group(2).strip()
            # Handle fractions
            if '/' in qty_str:
                parts = qty_str.split('/')
                try:
                    qty = float(parts[0]) / float(parts[1])
                except:
                    qty = 0
            else:
                try:
                    qty = float(qty_str.replace(' ', '.'))
                except:
                    qty = 0
            # Check for unit
            unit_match = re.match(r'^(' + '|'.join(UNITS) + r')s?\s*(.*)', remainder, re.IGNORECASE)
            if unit_match:
                raw_unit = unit_match.group(1).lower()
                unit = UNIT_MAP.get(raw_unit, raw_unit)
                name = unit_match.group(2).strip()
            else:
                name = remainder
        if not name:
            name = text
        # Clean up name
        name = re.sub(r'^(of |the |a |an )', '', name, flags=re.IGNORECASE).strip()
        name = name.rstrip(',').strip()
        if name:
            parsed.append({'name': name, 'quantity': round(qty, 2), 'unit': unit})
    return jsonify(parsed)

# ─── Health ────────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'version': '1.0.0'})

# ─── Init ──────────────────────────────────────────────────────────────────────

with app.app_context():
    db.create_all()
    # Seed default profiles if none exist
    if Profile.query.count() == 0:
        db.session.add(Profile(name='Kievz', allergens=['lactose'], macro_priority=['calories', 'protein']))
        db.session.add(Profile(name='Lauren', allergens=['gluten'], macro_priority=['carbs', 'sugar']))
        db.session.commit()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=os.environ.get('FLASK_DEBUG', 'false').lower() == 'true')
