/**
 * DDS Shared Component JavaScript
 * Utilities for navigation, forms, lazy loading, and interactions
 */

// ==========================================
//  MOBILE NAVIGATION TOGGLE
// ==========================================

function initMobileNav() {
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');
  const body = document.body;

  if (!hamburger || !navLinks) return;

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('active');
    hamburger.classList.toggle('active');

    // Prevent body scroll when menu open
    if (isOpen) {
      body.style.overflow = 'hidden';
    } else {
      body.style.overflow = '';
    }
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dds-nav') && navLinks.classList.contains('active')) {
      navLinks.classList.remove('active');
      hamburger.classList.remove('active');
      body.style.overflow = '';
    }
  });

  // Close menu when clicking nav link
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      hamburger.classList.remove('active');
      body.style.overflow = '';
    });
  });
}

// ==========================================
//  SMOOTH SCROLL ANCHOR LINKS
// ==========================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');

      // Skip if href is just "#" or empty
      if (!href || href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navHeight = document.querySelector('.dds-nav')?.offsetHeight || 0;
      const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });

      // Update URL hash without jumping
      history.pushState(null, null, href);
    });
  });
}

// ==========================================
//  TABLE OF CONTENTS ACTIVE STATE
// ==========================================

function initTableOfContents() {
  const toc = document.querySelector('.toc');
  if (!toc) return;

  const tocLinks = toc.querySelectorAll('a[href^="#"]');
  const sections = Array.from(tocLinks).map(link => {
    const id = link.getAttribute('href').substring(1);
    return document.getElementById(id);
  }).filter(Boolean);

  if (sections.length === 0) return;

  const observerOptions = {
    rootMargin: '-100px 0px -66%',
    threshold: 0
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${entry.target.id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, observerOptions);

  sections.forEach(section => observer.observe(section));
}

// ==========================================
//  FORM VALIDATION
// ==========================================

function initFormValidation() {
  const forms = document.querySelectorAll('form[data-validate]');

  forms.forEach(form => {
    const inputs = form.querySelectorAll('input, textarea, select');

    // Real-time validation on blur
    inputs.forEach(input => {
      input.addEventListener('blur', () => validateField(input));
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          validateField(input);
        }
      });
    });

    // Form submission validation
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;
      inputs.forEach(input => {
        if (!validateField(input)) {
          isValid = false;
        }
      });

      if (isValid) {
        handleFormSubmit(form);
      } else {
        // Focus first error
        const firstError = form.querySelector('.error');
        if (firstError) {
          firstError.focus();
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  });
}

function validateField(input) {
  const value = input.value.trim();
  const type = input.type;
  const required = input.hasAttribute('required');

  // Clear previous error
  input.classList.remove('error', 'success');
  const existingError = input.parentElement.querySelector('.error-message');
  if (existingError) existingError.remove();

  // Required check
  if (required && !value) {
    showError(input, 'This field is required');
    return false;
  }

  // Email validation
  if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      showError(input, 'Please enter a valid email address');
      return false;
    }
  }

  // Phone validation
  if (type === 'tel' && value) {
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
      showError(input, 'Please enter a valid phone number');
      return false;
    }
  }

  // URL validation
  if (type === 'url' && value) {
    try {
      new URL(value);
    } catch {
      showError(input, 'Please enter a valid URL');
      return false;
    }
  }

  // Min/max length
  const minLength = input.getAttribute('minlength');
  const maxLength = input.getAttribute('maxlength');
  if (minLength && value.length < parseInt(minLength)) {
    showError(input, `Minimum ${minLength} characters required`);
    return false;
  }
  if (maxLength && value.length > parseInt(maxLength)) {
    showError(input, `Maximum ${maxLength} characters allowed`);
    return false;
  }

  // Success state
  if (value) {
    input.classList.add('success');
  }

  return true;
}

function showError(input, message) {
  input.classList.add('error');

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    color: #ef4444;
    font-size: 0.875rem;
    margin-top: 0.5rem;
    animation: slideDown 0.2s ease-out;
  `;

  input.parentElement.appendChild(errorDiv);
}

async function handleFormSubmit(form) {
  const submitBtn = form.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent;

  try {
    // Show loading state
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    // Get form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // TODO: Replace with actual endpoint
    const endpoint = form.getAttribute('action') || '/api/contact';

    // Simulate API call (replace with real fetch)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // const response = await fetch(endpoint, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });

    // if (!response.ok) throw new Error('Submission failed');

    // Show success message
    showFormSuccess(form);
    form.reset();

  } catch (error) {
    showFormError(form, 'Something went wrong. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  }
}

function showFormSuccess(form) {
  const message = document.createElement('div');
  message.className = 'form-message success';
  message.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>Thank you! We'll be in touch soon.</span>
  `;
  message.style.cssText = `
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.3);
    border-radius: 0.5rem;
    color: #22c55e;
    margin-top: 1rem;
    animation: slideDown 0.3s ease-out;
  `;

  form.appendChild(message);
  setTimeout(() => message.remove(), 5000);
}

function showFormError(form, errorMessage) {
  const message = document.createElement('div');
  message.className = 'form-message error';
  message.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="8" x2="12" y2="12"></line>
      <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
    <span>${errorMessage}</span>
  `;
  message.style.cssText = `
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 0.5rem;
    color: #ef4444;
    margin-top: 1rem;
    animation: slideDown 0.3s ease-out;
  `;

  form.appendChild(message);
  setTimeout(() => message.remove(), 5000);
}

// ==========================================
//  LAZY LOADING IMAGES
// ==========================================

function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');

  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          img.classList.add('loaded');
          imageObserver.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px'
    });

    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for older browsers
    images.forEach(img => {
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
    });
  }
}

// ==========================================
//  SEARCH FUNCTIONALITY
// ==========================================

function initSearch() {
  const searchInput = document.querySelector('.search-bar input');
  const searchableItems = document.querySelectorAll('[data-searchable]');

  if (!searchInput || searchableItems.length === 0) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();

    searchableItems.forEach(item => {
      const text = item.textContent.toLowerCase();
      const match = !query || text.includes(query);

      item.style.display = match ? '' : 'none';

      // Optional: Add highlight
      if (match && query) {
        item.classList.add('search-match');
      } else {
        item.classList.remove('search-match');
      }
    });

    // Show "no results" message
    const visibleItems = Array.from(searchableItems).filter(item => item.style.display !== 'none');
    updateNoResultsMessage(searchInput.closest('.search-container'), visibleItems.length === 0, query);
  });
}

function updateNoResultsMessage(container, show, query) {
  if (!container) return;

  let noResultsEl = container.querySelector('.no-results-message');

  if (show && query) {
    if (!noResultsEl) {
      noResultsEl = document.createElement('div');
      noResultsEl.className = 'no-results-message';
      noResultsEl.style.cssText = `
        text-align: center;
        padding: 3rem 2rem;
        color: rgba(255, 255, 255, 0.6);
      `;
      container.appendChild(noResultsEl);
    }
    noResultsEl.innerHTML = `
      <p style="font-size: 1.25rem; margin-bottom: 0.5rem;">No results found</p>
      <p style="font-size: 0.875rem;">Try adjusting your search terms</p>
    `;
  } else if (noResultsEl) {
    noResultsEl.remove();
  }
}

// ==========================================
//  PAGINATION
// ==========================================

function initPagination() {
  const paginationContainers = document.querySelectorAll('.pagination');

  paginationContainers.forEach(container => {
    container.addEventListener('click', (e) => {
      const button = e.target.closest('button[data-page]');
      if (!button || button.disabled) return;

      e.preventDefault();

      const currentPage = parseInt(container.querySelector('.active')?.dataset.page || 1);
      const targetPage = button.dataset.page;
      let newPage = currentPage;

      if (targetPage === 'prev') {
        newPage = currentPage - 1;
      } else if (targetPage === 'next') {
        newPage = currentPage + 1;
      } else {
        newPage = parseInt(targetPage);
      }

      // Update active state
      container.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
      const newActiveBtn = container.querySelector(`button[data-page="${newPage}"]`);
      if (newActiveBtn) newActiveBtn.classList.add('active');

      // Dispatch custom event for page change
      container.dispatchEvent(new CustomEvent('pagechange', {
        detail: { page: newPage, previousPage: currentPage }
      }));

      // Scroll to top of content
      const contentContainer = document.querySelector('[data-paginated-content]');
      if (contentContainer) {
        contentContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ==========================================
//  COUNTER ANIMATIONS
// ==========================================

function initCounterAnimations() {
  const counters = document.querySelectorAll('[data-counter]');

  if (counters.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
        animateCounter(entry.target);
        entry.target.classList.add('counted');
      }
    });
  }, {
    threshold: 0.5
  });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
  const target = parseInt(element.dataset.counter);
  const duration = 2000;
  const increment = target / (duration / 16);
  let current = 0;

  const updateCounter = () => {
    current += increment;
    if (current < target) {
      element.textContent = Math.floor(current).toLocaleString();
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target.toLocaleString();
    }
  };

  updateCounter();
}

// ==========================================
//  INITIALIZATION
// ==========================================

function initDDSComponents() {
  // Core functionality
  initMobileNav();
  initSmoothScroll();
  initTableOfContents();
  initFormValidation();
  initLazyLoading();
  initSearch();
  initPagination();
  initCounterAnimations();

  // Terminal controller (auto-initializes in terminal.js)
  if (typeof window.terminalController !== 'undefined') {
    console.log('Terminal controller ready');
  }

  // Add slide-down animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `;
  document.head.appendChild(style);
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDDSComponents);
} else {
  initDDSComponents();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initMobileNav,
    initSmoothScroll,
    initTableOfContents,
    initFormValidation,
    initLazyLoading,
    initSearch,
    initPagination,
    initCounterAnimations
  };
}
