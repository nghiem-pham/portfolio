// ===== Lamp Puller Theme Toggle =====
const lampToggle = document.getElementById('lampToggle');
const root = document.documentElement;

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
root.setAttribute('data-theme', savedTheme);

lampToggle.addEventListener('click', () => {
  // Pull animation
  lampToggle.classList.add('pulling');

  setTimeout(() => {
    lampToggle.classList.remove('pulling');

    // Toggle theme
    const current = root.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }, 200);
});

// ===== Typewriter Effect =====
const typewriterPhrases = [
  'full-stack applications.',
  'scalable REST APIs.',
  'concurrent systems.',
  'elegant user interfaces.',
  'real-time simulations.',
];

const typewriterEl = document.getElementById('typewriter');
let phraseIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typewrite() {
  const currentPhrase = typewriterPhrases[phraseIndex];

  if (isDeleting) {
    typewriterEl.textContent = currentPhrase.substring(0, charIndex - 1);
    charIndex--;
  } else {
    typewriterEl.textContent = currentPhrase.substring(0, charIndex + 1);
    charIndex++;
  }

  let delay = isDeleting ? 30 : 60;

  if (!isDeleting && charIndex === currentPhrase.length) {
    delay = 2000;
    isDeleting = true;
  } else if (isDeleting && charIndex === 0) {
    isDeleting = false;
    phraseIndex = (phraseIndex + 1) % typewriterPhrases.length;
    delay = 400;
  }

  setTimeout(typewrite, delay);
}

typewrite();

// ===== Navbar Scroll Effect =====
const navbar = document.getElementById('navbar');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
});

// ===== Mobile Menu Toggle =====
const mobileToggle = document.getElementById('mobileToggle');
const mobileMenu = document.getElementById('mobileMenu');

mobileToggle.addEventListener('click', () => {
  mobileMenu.classList.toggle('active');
});

// Close mobile menu when clicking a link
mobileMenu.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mobileMenu.classList.remove('active');
  });
});

// ===== Scroll Animations (Intersection Observer) =====
const animateElements = document.querySelectorAll('[data-animate]');

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        // Stagger animations within the same parent
        const siblings = entry.target.parentElement.querySelectorAll('[data-animate]');
        const siblingIndex = Array.from(siblings).indexOf(entry.target);
        const staggerDelay = siblingIndex * 100;

        setTimeout(() => {
          entry.target.classList.add('visible');
        }, staggerDelay);

        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px',
  }
);

animateElements.forEach((el) => observer.observe(el));

// ===== Smooth Scroll for Navigation =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const offset = navbar.offsetHeight + 20;
      const position = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: position, behavior: 'smooth' });
    }
  });
});

// ===== Active Nav Link Highlight =====
const sections = document.querySelectorAll('.section, .hero');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = '';
    if (link.getAttribute('href') === `#${current}`) {
      link.style.color = 'var(--text-primary)';
    }
  });
});
