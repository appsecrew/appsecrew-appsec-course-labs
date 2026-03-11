from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import check_password_hash, generate_password_hash
import os
from datetime import datetime

app = Flask(__name__)

# VULNERABLE: Weak secret key for production
app.config['SECRET_KEY'] = 'dev-secret-key-123'  # SECURITY ISSUE
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 
    'sqlite:///ecommerce.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# VULNERABLE: No CSRF protection
# VULNERABLE: No Content Security Policy headers
# VULNERABLE: Debug mode enabled

db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

# Product model
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50))

# Review model (vulnerable to stored XSS)
class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)  # VULNERABLE: No sanitization
    rating = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Contact model for blind XSS (must be defined before routes that use it)
class ContactMessage(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)  # VULNERABLE: No sanitization
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Flask-Login required properties
User.is_active = True
User.is_anonymous = False
User.is_authenticated = True
User.get_id = lambda self: str(self.id)

# VULNERABLE ROUTE: Reflected XSS in search
@app.route('/search')
def search():
    query = request.args.get('q', '')
    
    # SECURITY ISSUE: Direct template rendering without escaping
    # This allows reflected XSS attacks
    if query:
        products = Product.query.filter(Product.name.contains(query)).all()
    else:
        products = []
    
    # VULNERABLE: Query parameter rendered directly in template
    return render_template('search.html', products=products, query=query)

# VULNERABLE ROUTE: Stored XSS in reviews
@app.route('/product/<int:product_id>')
def product_detail(product_id):
    product = Product.query.get_or_404(product_id)
    reviews = Review.query.filter_by(product_id=product_id).all()
    
    # VULNERABLE: Reviews rendered without escaping
    return render_template('product.html', product=product, reviews=reviews)

@app.route('/add_review/<int:product_id>', methods=['POST'])
@login_required
def add_review(product_id):
    content = request.form.get('content')
    rating = request.form.get('rating', type=int)
    
    # VULNERABLE: No input sanitization for XSS
    review = Review(
        product_id=product_id,
        user_id=current_user.id,
        content=content,  # SECURITY ISSUE: Raw user input stored
        rating=rating
    )
    
    db.session.add(review)
    db.session.commit()
    
    flash('Review added successfully!')
    return redirect(url_for('product_detail', product_id=product_id))

# VULNERABLE ROUTE: DOM-based XSS in profile
@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html', user=current_user)

@app.route('/update_profile', methods=['POST'])
@login_required
def update_profile():
    # VULNERABLE: No CSRF protection
    username = request.form.get('username')
    email = request.form.get('email')
    
    # SECURITY ISSUE: Direct database update without proper validation
    current_user.username = username
    current_user.email = email
    db.session.commit()
    
    flash('Profile updated successfully!')
    return redirect(url_for('profile'))

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            return redirect(url_for('index'))
        else:
            flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Basic validation (but no XSS protection)
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return render_template('register.html')
        
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        flash('Registration successful!')
        return redirect(url_for('login'))
    
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# VULNERABLE ADMIN ROUTE: Blind XSS in contact form
@app.route('/admin/contacts')
@login_required
def admin_contacts():
    if not current_user.is_admin:
        flash('Access denied')
        return redirect(url_for('index'))
    
    # VULNERABLE: Admin views user-submitted content without XSS protection
    contacts = ContactMessage.query.all()
    return render_template('admin/contacts.html', contacts=contacts)

@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        name = request.form.get('name')
        email = request.form.get('email')
        message = request.form.get('message')
        
        # VULNERABLE: Stored XSS that will be viewed by admin (Blind XSS)
        contact = ContactMessage(name=name, email=email, message=message)
        db.session.add(contact)
        db.session.commit()
        
        flash('Message sent successfully!')
        return redirect(url_for('contact'))
    
    return render_template('contact.html')

@app.route('/lab-guide')
def lab_guide():
    return render_template('lab_guide.html')

@app.route('/')
def index():
    products = Product.query.limit(6).all()
    return render_template('index.html', products=products)

# API endpoint with XSS vulnerability
@app.route('/api/search')
def api_search():
    query = request.args.get('q', '')
    
    if query:
        products = Product.query.filter(Product.name.contains(query)).all()
        results = []
        for product in products:
            results.append({
                'id': product.id,
                'name': product.name,  # VULNERABLE: No escaping in JSON response
                'price': product.price
            })
    else:
        results = []
    
    # VULNERABLE: Direct inclusion of user input in JSON response
    return jsonify({
        'query': query,  # SECURITY ISSUE: XSS in JSON API
        'results': results
    })

# Error handlers that leak information
@app.errorhandler(404)
def not_found(error):
    # VULNERABLE: Reflects URL in error page
    requested_url = request.url
    return render_template('404.html', url=requested_url), 404

@app.errorhandler(500)
def internal_error(error):
    # VULNERABLE: Debug information in production
    return render_template('500.html', error=str(error)), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        
        # Create admin user if doesn't exist
        admin = User.query.filter_by(username='admin').first()
        if not admin:
            admin = User(username='admin', email='admin@flaskshop.com', is_admin=True)
            admin.set_password('admin123')  # SECURITY ISSUE: Weak password
            db.session.add(admin)
            db.session.commit()
            
        # Create sample products
        if Product.query.count() == 0:
            products = [
                Product(name='Laptop Computer', description='High-performance laptop for work and gaming', price=1299.99, category='Electronics'),
                Product(name='Smartphone', description='Latest smartphone with advanced features', price=899.99, category='Electronics'),
                Product(name='Coffee Maker', description='Automatic coffee maker with timer', price=149.99, category='Kitchen'),
                Product(name='Running Shoes', description='Comfortable running shoes for daily exercise', price=89.99, category='Sports'),
                Product(name='Desk Chair', description='Ergonomic office chair with lumbar support', price=299.99, category='Furniture'),
                Product(name='Bluetooth Headphones', description='Wireless headphones with noise cancellation', price=199.99, category='Electronics')
            ]
            for product in products:
                db.session.add(product)
            db.session.commit()
    
    app.run(debug=True, host='0.0.0.0', port=5000)  # SECURITY ISSUE: Debug mode
