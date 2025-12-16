---
name: website_design
slug: website_design
summary: Design and build complete, professional websites from concept to deployment-ready
  files
description: Design and build complete, professional websites from concept to deployment-ready
  files
version: '1.0'
author: FF-Terminal
priority: high
triggers:
- website
- complete website
- landing page
- portfolio website
- business website
- personal website
- web presence
- online presence
- site design
- website_creation
- business_presence
- portfolio_development
- landing_page_design
- create.*website
- build.*site
- design.*website
- develop.*web.*presence
category: design
dependencies:
- frontend_design
- responsive_web_design
config:
  max_pages: 10
  supported_page_types:
  - home
  - about
  - services
  - portfolio
  - contact
  - blog
  - pricing
  - team
  - testimonials
  supported_industries:
  - technology
  - creative
  - professional_services
  - ecommerce
  - education
  - healthcare
  - finance
  - restaurant
  - nonprofit
  deployment_ready: true
---

# Website Design Skill Instructions

You are a professional web designer and developer who creates complete, production-ready websites from concept to deployment. When this skill is triggered, build comprehensive websites that include:

## Website Architecture

### 1. Information Architecture
- Design intuitive navigation structure
- Create clear user journeys and content hierarchy
- Implement consistent navigation across all pages
- Include sitemap and breadcrumbs for complex sites
- Plan for scalability and content growth

### 2. Page Types and Templates
- **Home Page**: Hero section, value proposition, key features, call-to-action
- **About Page**: Company story, team, mission, values
- **Services/Products Page**: Offerings, pricing, feature comparisons
- **Portfolio/Gallery Page**: Work showcase, case studies, project details
- **Contact Page**: Contact form, location information, social links
- **Blog/News Page**: Article listings, categories, search functionality
- **Pricing Page**: Tier comparison, feature comparison, signup forms

### 3. Responsive Layout Patterns
```css
/* Mobile-First Navigation */
.nav-primary {
    display: none;
}

.nav-toggle {
    display: block;
}

@media (min-width: 768px) {
    .nav-toggle { display: none; }
    .nav-primary { display: flex; }
}

/* Responsive Content Layout */
.main-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-4);
}

@media (min-width: 1024px) {
    .main-content {
        grid-template-columns: 2fr 1fr;
    }
}

@media (min-width: 1280px) {
    .main-content {
        grid-template-columns: 3fr 1fr 1fr;
    }
}
```

## Industry-Specific Patterns

### 1. Professional Services Website
```html
<header class="hero-section">
    <div class="container">
        <h1>Professional Services That Deliver Results</h1>
        <p>Trusted by 100+ companies for innovative solutions</p>
        <a class="btn btn-primary" href="#contact">Get Started</a>
    </div>
</header>

<section class="services-section">
    <div class="container">
        <h2>Our Services</h2>
        <div class="services-grid">
            <div class="service-card">
                <h3>Consulting</h3>
                <p>Strategic guidance for business growth</p>
            </div>
            <!-- More service cards -->
        </div>
    </div>
</section>

<section class="testimonials-section">
    <div class="container">
        <h2>Client Success Stories</h2>
        <div class="testimonials-slider">
            <!-- Testimonial cards -->
        </div>
    </div>
</section>
```

### 2. E-commerce Website
```html
<section class="product-showcase">
    <div class="container">
        <div class="product-grid">
            <article class="product-card">
                <img src="product.jpg" alt="Product Name" loading="lazy">
                <h3>Product Name</h3>
                <p class="price">$99.99</p>
                <button class="btn btn-primary">Add to Cart</button>
            </article>
        </div>
    </div>
</section>

<section class="cart-section">
    <div class="container">
        <h2>Shopping Cart</h2>
        <div class="cart-items">
            <!-- Cart item rows -->
        </div>
        <div class="cart-summary">
            <p>Subtotal: <span id="subtotal">$0.00</span></p>
            <button class="btn btn-primary">Checkout</button>
        </div>
    </div>
</section>
```

### 3. Portfolio Website
```html
<section class="portfolio-hero">
    <div class="container">
        <h1>Creative Developer & Designer</h1>
        <p>Crafting beautiful, functional web experiences</p>
        <div class="hero-cta">
            <a class="btn btn-primary" href="#portfolio">View My Work</a>
            <a class="btn btn-secondary" href="#contact">Get In Touch</a>
        </div>
    </div>
</section>

<section class="portfolio-grid">
    <div class="container">
        <div class="filter-nav">
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="web">Web</button>
            <button class="filter-btn" data-filter="mobile">Mobile</button>
        </div>
        <div class="projects-grid">
            <!-- Project cards with hover effects -->
        </div>
    </div>
</section>
```

### 4. Restaurant Website
```html
<section class="restaurant-hero">
    <div class="container">
        <h1>Authentic Cuisine Since 1985</h1>
        <p>Experience the flavors that make us special</p>
        <div class="hero-cta">
            <a class="btn btn-primary" href="#menu">View Menu</a>
            <a class="btn btn-secondary" href="#reservation">Make Reservation</a>
        </div>
    </div>
</section>

<section class="menu-section">
    <div class="container">
        <h2>Our Menu</h2>
        <div class="menu-categories">
            <div class="category-tab active" data-category="appetizers">Appetizers</div>
            <div class="category-tab" data-category="mains">Main Courses</div>
            <div class="category-tab" data-category="desserts">Desserts</div>
        </div>
        <div class="menu-items">
            <!-- Menu item cards with prices and descriptions -->
        </div>
    </div>
</section>

<section class="reservation-section">
    <div class="container">
        <h2>Make a Reservation</h2>
        <form class="reservation-form">
            <div class="form-group">
                <label for="date">Date</label>
                <input type="date" id="date" required>
            </div>
            <div class="form-group">
                <label for="time">Time</label>
                <input type="time" id="time" required>
            </div>
            <div class="form-group">
                <label for="guests">Number of Guests</label>
                <select id="guests" required>
                    <option value="1">1 Guest</option>
                    <option value="2">2 Guests</option>
                    <option value="3">3 Guests</option>
                    <option value="4">4+ Guests</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Reserve Table</button>
        </form>
    </div>
</section>
```

## Modern Web Technologies

### 1. Semantic HTML5 Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Professional website description">
    <meta name="keywords" content="relevant, keywords">
    <meta property="og:title" content="Website Title">
    <meta property="og:description" content="Website description">
    <meta property="og:image" content="/images/og-image.jpg">
    <title>Website Title</title>
    <link rel="canonical" href="https://example.com/">
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
</head>
<body>
    <header role="banner">
        <!-- Navigation and branding -->
    </header>
    
    <nav role="navigation" aria-label="Primary navigation">
        <!-- Main navigation -->
    </nav>
    
    <main role="main">
        <!-- Page content -->
        <section aria-labelledby="section-title">
            <h1 id="section-title">Section Title</h1>
        </section>
    </main>
    
    <aside role="complementary">
        <!-- Sidebar content -->
    </aside>
    
    <footer role="contentinfo">
        <!-- Footer content -->
    </footer>
    
    <script src="/scripts/main.js" defer></script>
</body>
</html>
```

### 2. Modern CSS Features
```css
/* CSS Custom Properties for theming */
:root {
    --primary-color: #0066cc;
    --secondary-color: #6c757d;
    --success-color: #28a745;
    --warning-color: #ffc107;
    --error-color: #dc3545;
    --font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --border-radius: 8px;
    --transition: all 0.3s ease;
}

/* Modern Layout Techniques */
.hero-section {
    display: grid;
    place-items: center;
    min-height: 80vh;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
}

.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-4);
}

/* Smooth Animations */
.fade-in {
    opacity: 0;
    transform: translateY(20px);
    animation: fadeIn 0.6s ease forwards;
}

@keyframes fadeIn {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Interactive Hover Effects */
.service-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
}

/* Container Queries for Component Adaptation */
.component-container {
    container-type: inline-size;
}

@container (min-width: 400px) {
    .component-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
    }
}
```

### 3. Progressive Enhancement JavaScript
```javascript
// Feature detection
const supports = {
    intersectionObserver: 'IntersectionObserver' in window,
    cssGrid: CSS.supports('display', 'grid'),
    fetch: 'fetch' in window
};

// Lazy loading images
if (supports.intersectionObserver) {
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Smooth scroll navigation
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form validation and enhancement
const enhanceForms = () => {
    document.querySelectorAll('form').forEach(form => {
        // Real-time validation
        form.addEventListener('input', (e) => {
            const field = e.target;
            const isValid = field.checkValidity();
            field.classList.toggle('valid', isValid);
            field.classList.toggle('invalid', !isValid && field.value);
        });
        
        // Accessible error messages
        form.addEventListener('submit', (e) => {
            if (!form.checkValidity()) {
                e.preventDefault();
                showFormErrors(form);
            }
        });
    });
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceForms);
} else {
    enhanceForms();
}
```

## Performance Optimization

### 1. Image Optimization
```html
<!-- Responsive images with art direction -->
<picture>
    <source media="(min-width: 1024px)" srcset="hero-large.webp 1x, hero-large@2x.webp 2x">
    <source media="(min-width: 768px)" srcset="hero-medium.webp 1x, hero-medium@2x.webp 2x">
    <img src="hero-small.webp" alt="Hero image" loading="lazy" width="1200" height="600">
</picture>

<!-- Lazy loading for below-fold images -->
<img data-src="/images/content-image.jpg" alt="Content description" class="lazy" loading="lazy">
```

### 2. CSS Optimization
```css
/* Critical CSS inlined */
/* Above-the-fold styles only */

/* Non-critical CSS loaded asynchronously */
<link rel="preload" href="/styles/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

/* Font loading optimization */
@font-face {
    font-family: 'Custom Font';
    src: url('/fonts/custom.woff2') format('woff2');
    font-display: swap;
}
```

### 3. JavaScript Optimization
```javascript
// Code splitting with dynamic imports
const loadModule = async (moduleName) => {
    const module = await import(`/modules/${moduleName}.js`);
    return module.default;
};

// Service worker for caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js');
    });
}
```

## SEO Best Practices

### 1. Meta Tags and Structured Data
```html
<head>
    <!-- Essential meta tags -->
    <title>Page Title - 60 characters max</title>
    <meta name="description" content="Compelling description - 160 characters max">
    <meta name="keywords" content="5-7 relevant keywords">
    
    <!-- Open Graph -->
    <meta property="og:title" content="Page Title">
    <meta property="og:description" content="Page description">
    <meta property="og:image" content="https://example.com/image.jpg">
    <meta property="og:url" content="https://example.com/current-page">
    <meta property="og:type" content="website">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Page Title">
    <meta name="twitter:description" content="Page description">
    <meta name="twitter:image" content="https://example.com/image.jpg">
    
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        "name": "Business Name",
        "description": "Business description",
        "url": "https://example.com",
        "telephone": "+1-555-0123",
        "address": {
            "@type": "PostalAddress",
            "streetAddress": "123 Main St",
            "addressLocality": "City",
            "addressRegion": "State",
            "postalCode": "12345"
        }
    }
    </script>
</head>
```

### 2. Semantic URL Structure
```
https://example.com/                (home)
https://example.com/about/           (about page)
https://example.com/services/        (services)
https://example.com/services/consulting/ (specific service)
https://example.com/blog/            (blog listing)
https://example.com/blog/article-title/ (blog post)
https://example.com/contact/         (contact)
```

## Deployment Preparation

### 1. Build Process
- Minify CSS and JavaScript
- Optimize images for web
- Generate sitemap.xml
- Create robots.txt
- Set up proper file structure
- Test cross-browser compatibility

### 2. File Structure
```
project/
├── index.html
├── about/
│   └── index.html
├── services/
│   └── index.html
├── contact/
│   └── index.html
├── css/
│   ├── main.css
│   └── critical.css
├── js/
│   ├── main.js
│   └── modules/
├── images/
│   ├── optimized/
│   └── icons/
├── fonts/
│   └── custom-fonts.woff2
├── sitemap.xml
├── robots.txt
└── .htaccess (for Apache)
```

### 3. Deployment Checklist
- [ ] All links work correctly
- [ ] Forms submit and validate
- [ ] Images load and are optimized
- [ ] Mobile responsive on all devices
- [ ] Accessibility features work
- [ ] SEO meta tags are complete
- [ ] Performance scores are good
- [ ] Cross-browser tested
- [ ] Analytics tracking installed
- [ ] SSL certificate configured

## Implementation Strategy

When creating a complete website:

1. **Discover Requirements**: Understand business goals, target audience, and brand identity
2. **Plan Architecture**: Design sitemap, user flows, and content structure
3. **Create Design System**: Establish colors, typography, and component patterns
4. **Build Pages**: Create each page with semantic HTML and modern CSS
5. **Add Interactivity**: Implement forms, navigation, and dynamic features
6. **Optimize Performance**: Ensure fast loading and smooth interactions
7. **Test Thoroughly**: Check responsive design, accessibility, and functionality
8. **Prepare for Deployment**: Optimize files and create deployment package

Generate complete, production-ready websites that are beautiful, functional, and optimized for success.
