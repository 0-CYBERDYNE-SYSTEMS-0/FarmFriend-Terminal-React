---
name: component_library
slug: component_library
summary: Create reusable, accessible UI components with modern design patterns and
  interactions
description: Create reusable, accessible UI components with modern design patterns
  and interactions
version: '1.0'
author: FF-Terminal
priority: medium
triggers:
- component
- button
- card
- form
- modal
- navigation
- dropdown
- accordion
- tabs
- carousel
- slider
- component_creation
- ui_element_design
- interactive_component
- create.*component
- build.*button
- design.*card
- make.*form
- interactive.*element
category: design
dependencies:
- frontend_design
- responsive_web_design
config:
  supported_components:
  - buttons
  - cards
  - forms
  - modals
  - navigation
  - dropdowns
  - accordions
  - tabs
  - carousels
  - sliders
  - tooltips
  - badges
  - alerts
  accessibility_features:
  - aria_labels
  - keyboard_navigation
  - screen_reader_support
  - focus_management
  design_systems:
  - material_design
  - apple_hig
  - bootstrap
  - tailwind
  - custom_systems
---

# UI Component Library Skill Instructions

You are an expert component designer who creates reusable, accessible, and modern UI components. When this skill is triggered, build complete components with:

## Component Design Principles

### 1. Reusability
- Single responsibility: Each component does one thing well
- Props-driven: Configure through attributes, not hardcoded values
- Stateless where possible: Manage state externally or through callbacks
- Theme-aware: Use CSS custom properties for consistent styling

### 2. Accessibility First
- Semantic HTML: Use appropriate elements for each component type
- ARIA attributes: Add necessary labels, roles, and states
- Keyboard navigation: Ensure all interactions work without mouse
- Screen reader support: Test with assistive technologies
- Focus management: Proper tab order and focus trapping for modals

### 3. Progressive Enhancement
- Base functionality: Works without JavaScript
- Enhanced experience: Add interactions and animations when JS is available
- Graceful degradation: Fallback styles for older browsers
- Feature detection: Use modern APIs when available

## Button Components

### 1. Base Button
```html
<button class="btn" type="button">
    <span class="btn-text">Button Text</span>
</button>

<style>
.btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid transparent;
    border-radius: var(--space-1);
    font-family: inherit;
    font-size: var(--font-base);
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    min-height: 44px; /* Touch-friendly */
    padding: var(--space-2) var(--space-4);
    position: relative;
    overflow: hidden;
}

.btn:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.5);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
}

.btn:active::after {
    width: 300px;
    height: 300px;
}
</style>
```

### 2. Icon Button
```html
<button class="btn-icon" type="button" aria-label="Close">
    <svg class="btn-icon-svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
</button>

<style>
.btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 1px solid transparent;
    border-radius: var(--space-1);
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-icon:hover {
    background: rgb(var(--color-primary-rgb), 0.1);
}

.btn-icon:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.btn-icon-svg {
    width: 20px;
    height: 20px;
    color: rgb(var(--color-primary-rgb));
}
</style>
```

### 3. Button Group
```html
<div class="btn-group" role="group" aria-label="Button group">
    <button class="btn" type="button">Option 1</button>
    <button class="btn" type="button">Option 2</button>
    <button class="btn" type="button">Option 3</button>
</div>

<style>
.btn-group {
    display: inline-flex;
    border-radius: var(--space-1);
    overflow: hidden;
}

.btn-group .btn {
    border-radius: 0;
    border-right: none;
}

.btn-group .btn:first-child {
    border-top-left-radius: var(--space-1);
    border-bottom-left-radius: var(--space-1);
}

.btn-group .btn:last-child {
    border-top-right-radius: var(--space-1);
    border-bottom-right-radius: var(--space-1);
    border-right: 1px solid rgb(var(--color-primary-rgb), 0.3);
}

.btn-group .btn:focus {
    position: relative;
    z-index: 1;
}
</style>
```

## Card Components

### 1. Base Card
```html
<article class="card">
    <header class="card-header">
        <h3 class="card-title">Card Title</h3>
    </header>
    <div class="card-body">
        <p class="card-content">Card content goes here...</p>
    </div>
    <footer class="card-footer">
        <button class="btn btn-sm">Learn More</button>
    </footer>
</article>

<style>
.card {
    background: white;
    border: 1px solid rgb(var(--color-primary-rgb), 0.1);
    border-radius: var(--space-2);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.card-header {
    padding: var(--space-4);
    border-bottom: 1px solid rgb(var(--color-primary-rgb), 0.1);
}

.card-title {
    margin: 0;
    font-size: var(--font-lg);
    font-weight: 600;
    color: rgb(var(--color-primary-rgb));
}

.card-body {
    padding: var(--space-4);
}

.card-content {
    margin: 0;
    line-height: var(--leading-base);
    color: var(--color-neutral);
}

.card-footer {
    padding: var(--space-3) var(--space-4);
    background: rgb(var(--color-primary-rgb), 0.05);
    border-top: 1px solid rgb(var(--color-primary-rgb), 0.1);
}
</style>
```

### 2. Product Card
```html
<article class="product-card">
    <div class="product-image">
        <img src="product.jpg" alt="Product Name" loading="lazy">
    </div>
    <div class="product-info">
        <h3 class="product-name">Product Name</h3>
        <p class="product-description">Brief product description...</p>
        <div class="product-price">$99.99</div>
    </div>
    <button class="btn btn-primary product-action">Add to Cart</button>
</article>

<style>
.product-card {
    background: white;
    border: 1px solid rgb(var(--color-primary-rgb), 0.1);
    border-radius: var(--space-2);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    overflow: hidden;
    transition: transform 0.2s ease;
    display: flex;
    flex-direction: column;
}

.product-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0,0,0,0.15);
}

.product-image {
    height: 200px;
    overflow: hidden;
}

.product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}

.product-card:hover .product-image img {
    transform: scale(1.05);
}

.product-info {
    padding: var(--space-4);
    flex: 1;
}

.product-name {
    margin: 0 0 var(--space-2) 0;
    font-size: var(--font-lg);
    font-weight: 600;
    color: rgb(var(--color-primary-rgb));
}

.product-description {
    margin: 0 0 var(--space-3) 0;
    font-size: var(--font-sm);
    color: var(--color-secondary);
    line-height: var(--leading-sm);
}

.product-price {
    font-size: var(--font-xl);
    font-weight: 700;
    color: rgb(var(--color-accent-rgb));
    margin-bottom: var(--space-3);
}

.product-action {
    margin: var(--space-3);
    width: calc(100% - var(--space-6));
    align-self: center;
}
</style>
```

## Form Components

### 1. Form Field
```html
<div class="form-group">
    <label for="email" class="form-label">Email Address</label>
    <input type="email" id="email" class="form-input" placeholder="you@example.com" required>
    <div class="form-help">We'll never share your email.</div>
    <div class="form-error" role="alert"></div>
</div>

<style>
.form-group {
    margin-bottom: var(--space-4);
}

.form-label {
    display: block;
    margin-bottom: var(--space-1);
    font-weight: 500;
    color: rgb(var(--color-primary-rgb));
    font-size: var(--font-sm);
}

.form-input {
    width: 100%;
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgb(var(--color-primary-rgb), 0.3);
    border-radius: var(--space-1);
    font-size: var(--font-base);
    font-family: inherit;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    min-height: 44px; /* Touch-friendly */
}

.form-input:focus {
    outline: none;
    border-color: rgb(var(--color-primary-rgb));
    box-shadow: 0 0 0 3px rgb(var(--color-primary-rgb), 0.1);
}

.form-input:invalid {
    border-color: rgb(var(--color-error-rgb));
}

.form-input:invalid:focus {
    border-color: rgb(var(--color-error-rgb));
    box-shadow: 0 0 0 3px rgb(var(--color-error-rgb), 0.1);
}

.form-help {
    font-size: var(--font-sm);
    color: var(--color-secondary);
    margin-top: var(--space-1);
}

.form-error {
    font-size: var(--font-sm);
    color: rgb(var(--color-error-rgb));
    margin-top: var(--space-1);
    display: none;
}

.form-input:invalid ~ .form-error {
    display: block;
}
</style>
```

### 2. Checkbox Group
```html
<fieldset class="checkbox-group">
    <legend class="checkbox-legend">Select Options</legend>
    
    <label class="checkbox-item">
        <input type="checkbox" class="checkbox-input" name="options" value="option1">
        <span class="checkbox-box"></span>
        <span class="checkbox-label">Option 1</span>
    </label>
    
    <label class="checkbox-item">
        <input type="checkbox" class="checkbox-input" name="options" value="option2">
        <span class="checkbox-box"></span>
        <span class="checkbox-label">Option 2</span>
    </label>
</fieldset>

<style>
.checkbox-group {
    border: none;
    padding: 0;
}

.checkbox-legend {
    font-weight: 500;
    margin-bottom: var(--space-2);
    color: rgb(var(--color-primary-rgb));
}

.checkbox-item {
    display: flex;
    align-items: center;
    margin-bottom: var(--space-2);
    cursor: pointer;
}

.checkbox-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
}

.checkbox-box {
    width: 20px;
    height: 20px;
    border: 2px solid rgb(var(--color-primary-rgb), 0.3);
    border-radius: var(--space-1);
    margin-right: var(--space-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.checkbox-input:checked ~ .checkbox-box {
    background: rgb(var(--color-primary-rgb));
    border-color: rgb(var(--color-primary-rgb));
}

.checkbox-input:checked ~ .checkbox-box::after {
    content: '✓';
    color: white;
    font-weight: bold;
}

.checkbox-input:focus ~ .checkbox-box {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.checkbox-label {
    color: var(--color-neutral);
}

.checkbox-item:hover .checkbox-box {
    border-color: rgb(var(--color-primary-rgb));
}
</style>
```

## Modal Components

### 1. Base Modal
```html
<div class="modal-overlay" id="modal" role="dialog" aria-labelledby="modal-title" aria-modal="true" hidden>
    <div class="modal-container">
        <header class="modal-header">
            <h2 id="modal-title" class="modal-title">Modal Title</h2>
            <button class="modal-close" type="button" aria-label="Close modal">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
            </button>
        </header>
        
        <main class="modal-body">
            <p>Modal content goes here...</p>
        </main>
        
        <footer class="modal-footer">
            <button class="btn btn-secondary" type="button">Cancel</button>
            <button class="btn btn-primary" type="button">Confirm</button>
        </footer>
    </div>
</div>

<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
}

.modal-overlay:not([hidden]) {
    opacity: 1;
    visibility: visible;
}

.modal-container {
    background: white;
    border-radius: var(--space-3);
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 90vw;
    max-height: 90vh;
    width: 500px;
    transform: scale(0.9);
    transition: transform 0.3s ease;
}

.modal-overlay:not([hidden]) .modal-container {
    transform: scale(1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4);
    border-bottom: 1px solid rgb(var(--color-primary-rgb), 0.1);
}

.modal-title {
    margin: 0;
    font-size: var(--font-lg);
    color: rgb(var(--color-primary-rgb));
}

.modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    cursor: pointer;
    border-radius: var(--space-1);
    transition: background 0.2s ease;
}

.modal-close:hover {
    background: rgb(var(--color-primary-rgb), 0.1);
}

.modal-close:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.modal-body {
    padding: var(--space-4);
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    padding: var(--space-4);
    border-top: 1px solid rgb(var(--color-primary-rgb), 0.1);
}
</style>

<script>
// Modal JavaScript functionality
const modal = document.getElementById('modal');
const modalTriggers = document.querySelectorAll('[data-target="modal"]');
const modalClose = document.querySelector('.modal-close');

function openModal() {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modalClose.focus();
}

function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
}

modalTriggers.forEach(trigger => {
    trigger.addEventListener('click', openModal);
});

modalClose.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// Trap focus within modal
modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
    if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
});
</script>
```

## Navigation Components

### 1. Dropdown Menu
```html
<nav class="dropdown-nav">
    <button class="dropdown-toggle" type="button" aria-expanded="false" aria-haspopup="true">
        Menu
        <svg class="dropdown-arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
        </svg>
    </button>
    
    <ul class="dropdown-menu" role="menu" hidden>
        <li><a href="#" role="menuitem">Home</a></li>
        <li><a href="#" role="menuitem">About</a></li>
        <li><a href="#" role="menuitem">Services</a></li>
        <li><a href="#" role="menuitem">Contact</a></li>
    </ul>
</nav>

<style>
.dropdown-nav {
    position: relative;
}

.dropdown-toggle {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-2) var(--space-3);
    border: 1px solid rgb(var(--color-primary-rgb), 0.3);
    border-radius: var(--space-1);
    background: white;
    cursor: pointer;
    font-size: var(--font-base);
    font-weight: 500;
    transition: all 0.2s ease;
}

.dropdown-toggle:hover {
    border-color: rgb(var(--color-primary-rgb));
}

.dropdown-toggle:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
}

.dropdown-toggle[aria-expanded="true"] .dropdown-arrow {
    transform: rotate(180deg);
}

.dropdown-arrow {
    width: 16px;
    height: 16px;
    transition: transform 0.2s ease;
}

.dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    min-width: 200px;
    background: white;
    border: 1px solid rgb(var(--color-primary-rgb), 0.1);
    border-radius: var(--space-1);
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    list-style: none;
    margin: 0;
    padding: var(--space-1);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    z-index: 100;
}

.dropdown-menu:not([hidden]) {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

.dropdown-menu li {
    margin: 0;
}

.dropdown-menu a {
    display: block;
    padding: var(--space-2) var(--space-3);
    color: var(--color-neutral);
    text-decoration: none;
    border-radius: var(--space-1);
    transition: background 0.2s ease;
}

.dropdown-menu a:hover {
    background: rgb(var(--color-primary-rgb), 0.1);
    color: rgb(var(--color-primary-rgb));
}

.dropdown-menu a:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
}
</style>

<script>
// Dropdown JavaScript functionality
const dropdownToggle = document.querySelector('.dropdown-toggle');
const dropdownMenu = document.querySelector('.dropdown-menu');

function toggleDropdown() {
    const isOpen = dropdownToggle.getAttribute('aria-expanded') === 'true';
    
    dropdownToggle.setAttribute('aria-expanded', !isOpen);
    dropdownMenu.hidden = isOpen;
}

function closeDropdown(e) {
    if (!e.target.closest('.dropdown-nav')) {
        dropdownToggle.setAttribute('aria-expanded', 'false');
        dropdownMenu.hidden = true;
    }
}

dropdownToggle.addEventListener('click', toggleDropdown);
document.addEventListener('click', closeDropdown);

// Keyboard navigation
dropdownToggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
    }
});

if (dropdownMenu.hidden === false) {
    dropdownMenu.querySelector('a').focus();
}
</script>
```

## Tab Components

### 1. Tab System
```html
<div class="tab-container">
    <div class="tab-list" role="tablist">
        <button class="tab-btn active" role="tab" aria-selected="true" aria-controls="panel1" id="tab1">Tab 1</button>
        <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel2" id="tab2">Tab 2</button>
        <button class="tab-btn" role="tab" aria-selected="false" aria-controls="panel3" id="tab3">Tab 3</button>
    </div>
    
    <div class="tab-panels">
        <section class="tab-panel active" id="panel1" role="tabpanel" aria-labelledby="tab1">
            <h3>Panel 1 Content</h3>
            <p>Content for the first tab panel...</p>
        </section>
        
        <section class="tab-panel" id="panel2" role="tabpanel" aria-labelledby="tab2" hidden>
            <h3>Panel 2 Content</h3>
            <p>Content for the second tab panel...</p>
        </section>
        
        <section class="tab-panel" id="panel3" role="tabpanel" aria-labelledby="tab3" hidden>
            <h3>Panel 3 Content</h3>
            <p>Content for the third tab panel...</p>
        </section>
    </div>
</div>

<style>
.tab-container {
    border: 1px solid rgb(var(--color-primary-rgb), 0.1);
    border-radius: var(--space-2);
    overflow: hidden;
}

.tab-list {
    display: flex;
    border-bottom: 1px solid rgb(var(--color-primary-rgb), 0.1);
    background: rgb(var(--color-primary-rgb), 0.05);
}

.tab-btn {
    flex: 1;
    padding: var(--space-3);
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: var(--font-base);
    font-weight: 500;
    color: var(--color-secondary);
    transition: all 0.2s ease;
    position: relative;
}

.tab-btn:hover {
    color: rgb(var(--color-primary-rgb));
    background: rgb(var(--color-primary-rgb), 0.05);
}

.tab-btn.active,
.tab-btn[aria-selected="true"] {
    color: rgb(var(--color-primary-rgb));
    border-bottom: 2px solid rgb(var(--color-primary-rgb));
    background: white;
}

.tab-btn:focus {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
}

.tab-panels {
    background: white;
}

.tab-panel {
    padding: var(--space-4);
    opacity: 0;
    transform: translateY(10px);
    transition: all 0.3s ease;
}

.tab-panel.active,
.tab-panel:not([hidden]) {
    opacity: 1;
    transform: translateY(0);
}

.tab-panel[hidden] {
    display: none;
}
</style>

<script>
// Tab JavaScript functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function activateTab(tabButton) {
    // Deactivate all tabs and panels
    tabButtons.forEach(btn => {
        btn.setAttribute('aria-selected', 'false');
        btn.classList.remove('active');
    });
    
    tabPanels.forEach(panel => {
        panel.setAttribute('hidden', 'true');
        panel.classList.remove('active');
    });
    
    // Activate selected tab and panel
    const targetPanelId = tabButton.getAttribute('aria-controls');
    const targetPanel = document.getElementById(targetPanelId);
    
    tabButton.setAttribute('aria-selected', 'true');
    tabButton.classList.add('active');
    targetPanel.removeAttribute('hidden');
    targetPanel.classList.add('active');
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => activateTab(button));
    
    button.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activateTab(button);
        }
    });
});

// Arrow key navigation
tabButtons.forEach((button, index) => {
    button.addEventListener('keydown', (e) => {
        let targetIndex;
        
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            targetIndex = index > 0 ? index - 1 : tabButtons.length - 1;
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            targetIndex = index < tabButtons.length - 1 ? index + 1 : 0;
        }
        
        if (targetIndex !== undefined) {
            tabButtons[targetIndex].focus();
        }
    });
});
</script>
```

## Implementation Guidelines

When creating components:

1. **Accessibility First**: Include ARIA labels, roles, and keyboard navigation from the start
2. **Semantic HTML**: Use appropriate HTML elements for each component type
3. **CSS Custom Properties**: Use variables for theming and consistency
4. **Progressive Enhancement**: Ensure base functionality without JavaScript
5. **Touch-Friendly**: Minimum 44px touch targets for mobile
6. **Focus Management**: Proper focus order and visual focus indicators
7. **Screen Reader Support**: Test with assistive technologies
8. **Cross-Browser Compatibility**: Test on modern browsers
9. **Performance**: Optimize animations and interactions
10. **Documentation**: Include clear usage examples and API reference

Create reusable, accessible, and modern UI components that enhance user experience across all devices and abilities.
