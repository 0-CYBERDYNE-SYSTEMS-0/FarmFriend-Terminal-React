// FF Terminal Documentation - Interactive Features

// Theme Toggle (Dark/Light Mode)
function initThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = themeToggle?.querySelector('.theme-icon');

  // Check for saved theme preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');

  // Apply initial theme
  if (initialTheme === 'dark') {
    document.body.classList.add('dark');
    themeIcon.textContent = '☀️';
  }

  // Toggle theme on click
  themeToggle?.addEventListener('click', function() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');

    // Update icon
    themeIcon.textContent = isDark ? '☀️' : '🌙';

    // Save preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
}

// Mobile Sidebar Toggle
function initMobileToggle() {
  const mobileToggle = document.getElementById('mobileToggle');
  const sidebar = document.querySelector('.sidebar');

  if (!mobileToggle || !sidebar) return;

  mobileToggle.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    mobileToggle.classList.toggle('open');
  });

  // Close sidebar when clicking outside
  document.addEventListener('click', function(e) {
    if (!sidebar.contains(e.target) && !mobileToggle.contains(e.target)) {
      sidebar.classList.remove('open');
      mobileToggle.classList.remove('open');
    }
  });

  // Close sidebar on escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      sidebar.classList.remove('open');
      mobileToggle.classList.remove('open');
    }
  });
}

// Search Functionality
function initSearch() {
  const searchInput = document.querySelector('.search-input');
  const links = document.querySelectorAll('.sidebar-link');
  const sections = document.querySelectorAll('.sidebar-section');

  if (!searchInput) return;

  searchInput.addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase().trim();

    if (query === '') {
      // Reset: show all sections and links
      sections.forEach(section => section.style.display = 'block');
      links.forEach(link => link.style.display = 'block');
      return;
    }

    // Hide all sections first
    sections.forEach(section => section.style.display = 'none');

    // Show only matching links and their sections
    links.forEach(link => {
      const text = link.textContent.toLowerCase();
      const section = link.closest('.sidebar-section');

      if (text.includes(query)) {
        link.style.display = 'block';
        if (section) section.style.display = 'block';
      } else {
        link.style.display = 'none';
      }
    });
  });
}

// Copy to Clipboard
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', async function() {
      const header = this.closest('.code-block-header');
      const codeBlock = header?.nextElementSibling;
      if (!codeBlock) return;

      const code = codeBlock.textContent;

      try {
        await navigator.clipboard.writeText(code);
        this.textContent = 'Copied!';
        this.classList.add('copied');

        setTimeout(() => {
          this.textContent = 'Copy';
          this.classList.remove('copied');
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
        this.textContent = 'Failed';
        setTimeout(() => {
          this.textContent = 'Copy';
        }, 2000);
      }
    });
  });
}

// Syntax Highlighting
function highlightCode() {
  const codeBlocks = document.querySelectorAll('pre code');

  codeBlocks.forEach(block => {
    let code = block.textContent;

    // Escape HTML
    code = code.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    // Keywords
    code = code.replace(/\b(const|let|var|function|class|if|else|for|while|return|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof)\b/g,
                    '<span class="token keyword">$1</span>');

    // Strings
    code = code.replace(/(["'`])(?:(?!\1)[^\n\\]|\\.)*?\1/g,
                    '<span class="token string">$&</span>');

    // Comments
    code = code.replace(/(\/\/.*$|#.*$|\/\*[\s\S]*?\*\/)/gm,
                    '<span class="token comment">$1</span>');

    // Functions
    code = code.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g,
                    '<span class="token function">$1</span>(');

    // Numbers
    code = code.replace(/\b(\d+\.?\d*)\b/g,
                    '<span class="token number">$1</span>');

    block.innerHTML = code;
  });
}

// Active Link Highlighting
function updateActiveLink() {
  const links = document.querySelectorAll('.sidebar-link');
  const currentPath = window.location.pathname;

  links.forEach(link => {
    const linkPath = new URL(link.href).pathname;
    if (linkPath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

// Scroll to Section
function scrollToSection(id) {
  const element = document.getElementById(id);
  if (element) {
    const offset = 80; // Account for fixed sidebar
    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth'
    });
  }
}

// Anchor Links
function addAnchorLinks() {
  const headings = document.querySelectorAll('.main-content h2, .main-content h3');

  headings.forEach((heading, index) => {
    if (!heading.id) {
      heading.id = `section-${index}`;
    }

    const anchor = document.createElement('a');
    anchor.href = `#${heading.id}`;
    anchor.className = 'anchor-link';
    anchor.innerHTML = '¶';
    anchor.setAttribute('aria-label', 'Link to this section');

    heading.appendChild(anchor);
  });
}

// Keyboard Navigation
document.addEventListener('keydown', function(e) {
  // Ctrl/Cmd + K for search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Escape to close mobile menu
  if (e.key === 'Escape') {
    const sidebar = document.querySelector('.sidebar');
    const mobileToggle = document.getElementById('mobileToggle');
    if (sidebar) sidebar.classList.remove('open');
    if (mobileToggle) mobileToggle.classList.remove('open');
  }
});

// Smooth scroll for anchor links
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('anchor-link')) {
    e.preventDefault();
    const id = e.target.href.split('#')[1];
    scrollToSection(id);
  }
});

// Initialize All Features
document.addEventListener('DOMContentLoaded', function() {
  initThemeToggle();
  initMobileToggle();
  initSearch();
  initCopyButtons();
  highlightCode();
  addAnchorLinks();
  updateActiveLink();

  console.log('FF Terminal Documentation loaded successfully');
});

// Update active link on navigation
window.addEventListener('popstate', updateActiveLink);

// Export functions for external use
window.DocsUtils = {
  scrollToSection,
  highlightCode,
  updateActiveLink
};
