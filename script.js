const toggleBtn = document.getElementById('toggleBtn');
const banner = document.getElementById('banner');
const searchBox = document.getElementById('searchBox');
const container = document.getElementById('projectsContainer');

// Skeleton loading
for (let i = 0; i < 4; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton';
    container.appendChild(skeleton);
}

// Load projects
fetch('projects.json')
    .then(res => res.json())
    .then(projects => {
        // Remove skeletons
        document.querySelectorAll('.skeleton').forEach(s => s.remove());

        projects.forEach((proj, index) => {
            if (proj !== 'sources') {
                const card = document.createElement('div');
                card.className = 'card';

                const inner = document.createElement('div');
                inner.className = 'card-inner';

                const link = document.createElement('a');
                link.href = `./${proj}/`;
                link.textContent = `${proj} Javadoc`;

                link.setAttribute('data-tooltip', `View ${proj} Javadoc`);

                inner.appendChild(link);
                card.appendChild(inner);
                container.appendChild(card);

                // Sequential fade-in
                setTimeout(() => {
                    card.classList.add('show');
                }, index * 150); // 150ms delay per card
            }
        });
    });

// Update banner
function updateBanner() {
    banner.src = document.body.classList.contains('light') ?
        'sources/lightmode/banner.png' : 'sources/darkmode/banner.png';
}

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Focus search with '/'
document.addEventListener('keydown', e => {
    if(e.key === '/') {
        e.preventDefault();
        searchBox.focus();
    }
});

// Search with highlight
searchBox.addEventListener('input', () => {
    const filter = searchBox.value.toLowerCase();

    document.querySelectorAll('.card').forEach(card => {
        if (card.textContent.toLowerCase().includes(filter)) {
            card.classList.remove('hidden');
            card.style.animation = 'none';
            card.offsetHeight;
            card.style.animation = null;
        } else {
            card.classList.add('hidden');
        }
    });

    document.querySelectorAll('.card-inner a').forEach(link => {
        const text = link.textContent;
        if (filter) {
            const regex = new RegExp(`(${filter})`, 'gi');
            link.innerHTML = text.replace(regex, '<mark>$1</mark>');
        } else {
            link.innerHTML = text;
        }
    });
});

// Dark mode
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light');
    toggleBtn.textContent = '🌞';
} else {
    document.body.classList.remove('light');
    toggleBtn.textContent = '🌙';
}
updateBanner();

toggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    if (document.body.classList.contains('light')) {
        toggleBtn.textContent = '🌞';
        localStorage.setItem('theme', 'light');
    } else {
        toggleBtn.textContent = '🌙';
        localStorage.setItem('theme', 'dark');
    }
    updateBanner();
});