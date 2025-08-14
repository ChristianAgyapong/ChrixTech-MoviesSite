// Settings Management JavaScript
class SettingsManager {
    constructor() {
        this.initializeTheme();
        this.bindEvents();
        this.loadUserPreferences();
    }

    initializeTheme() {
        // Check if user has a saved theme preference
        const savedTheme = localStorage.getItem('userTheme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        
        if (savedTheme) {
            this.applyTheme(savedTheme);
        } else {
            this.applyTheme(systemTheme);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('userTheme') || localStorage.getItem('userTheme') === 'auto') {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    applyTheme(theme) {
        const body = document.body;
        const html = document.documentElement;
        
        // Remove existing theme classes
        body.classList.remove('theme-dark', 'theme-light', 'theme-auto');
        html.classList.remove('theme-dark', 'theme-light', 'theme-auto');
        
        // Apply new theme
        if (theme === 'auto') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            body.classList.add(`theme-${systemTheme}`);
            html.classList.add(`theme-${systemTheme}`);
        } else {
            body.classList.add(`theme-${theme}`);
            html.classList.add(`theme-${theme}`);
        }

        // Update theme selector if it exists
        const themeSelect = document.getElementById('id_theme');
        if (themeSelect) {
            themeSelect.value = theme;
        }

        // Save preference
        localStorage.setItem('userTheme', theme);
        
        // Update meta theme-color for mobile browsers
        this.updateMetaThemeColor(theme);
    }

    updateMetaThemeColor(theme) {
        let themeColor = '#18181c'; // Dark theme default
        
        if (theme === 'light' || (theme === 'auto' && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            themeColor = '#ffffff'; // Light theme
        }

        // Update or create theme-color meta tag
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = themeColor;
    }

    bindEvents() {
        // Theme change handler
        const themeSelect = document.getElementById('id_theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                this.applyTheme(e.target.value);
                this.showMessage('Theme updated successfully!', 'success');
            });
        }

        // View mode change handler
        const viewSelect = document.getElementById('id_default_view');
        if (viewSelect) {
            viewSelect.addEventListener('change', (e) => {
                localStorage.setItem('defaultView', e.target.value);
                this.showMessage('Default view updated!', 'success');
            });
        }

        // Movies per page change handler
        const perPageSelect = document.getElementById('id_movies_per_page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                localStorage.setItem('moviesPerPage', e.target.value);
                this.showMessage('Movies per page updated!', 'success');
            });
        }

        // Data saver mode handler
        const dataSaverToggle = document.getElementById('id_data_saver_mode');
        if (dataSaverToggle) {
            dataSaverToggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                localStorage.setItem('dataSaverMode', enabled);
                this.applyDataSaverMode(enabled);
                this.showMessage(`Data saver mode ${enabled ? 'enabled' : 'disabled'}!`, 'info');
            });
        }

        // Adult content toggle handler
        const adultContentToggle = document.getElementById('id_show_adult_content');
        if (adultContentToggle) {
            adultContentToggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.confirmAdultContent(e.target);
                }
            });
        }

        // Auto-add to history toggle
        const autoAddToggle = document.getElementById('id_auto_add_to_history');
        if (autoAddToggle) {
            autoAddToggle.addEventListener('change', (e) => {
                const message = e.target.checked ? 
                    'Movies will be automatically added to watch history' : 
                    'Movies will not be automatically added to watch history';
                this.showMessage(message, 'info');
            });
        }

        // Genre preference handlers
        const genreCheckboxes = document.querySelectorAll('input[name="preferred_genres"]');
        genreCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateGenrePreferences();
            });
        });

        // Rating range handlers
        const minRatingInput = document.getElementById('id_min_rating');
        const maxRatingInput = document.getElementById('id_max_rating');
        
        if (minRatingInput && maxRatingInput) {
            minRatingInput.addEventListener('input', (e) => {
                this.validateRatingRange(e.target, maxRatingInput);
            });
            
            maxRatingInput.addEventListener('input', (e) => {
                this.validateRatingRange(minRatingInput, e.target);
            });
        }

        // Year range handlers
        const minYearInput = document.getElementById('id_min_release_year');
        const maxYearInput = document.getElementById('id_max_release_year');
        
        if (minYearInput && maxYearInput) {
            minYearInput.addEventListener('input', (e) => {
                this.validateYearRange(e.target, maxYearInput);
            });
            
            maxYearInput.addEventListener('input', (e) => {
                this.validateYearRange(minYearInput, e.target);
            });
        }

        // Settings form submission
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            settingsForm.addEventListener('submit', (e) => {
                this.handleSettingsSubmission(e);
            });
        }

        // Export data handler
        const exportButton = document.querySelector('a[href*="export-data"]');
        if (exportButton) {
            exportButton.addEventListener('click', (e) => {
                this.handleDataExport(e);
            });
        }
    }

    loadUserPreferences() {
        // Load saved preferences from localStorage
        const savedView = localStorage.getItem('defaultView');
        const savedPerPage = localStorage.getItem('moviesPerPage');
        const savedDataSaver = localStorage.getItem('dataSaverMode') === 'true';

        // Apply saved preferences to form elements
        if (savedView) {
            const viewSelect = document.getElementById('id_default_view');
            if (viewSelect) viewSelect.value = savedView;
        }

        if (savedPerPage) {
            const perPageSelect = document.getElementById('id_movies_per_page');
            if (perPageSelect) perPageSelect.value = savedPerPage;
        }

        if (savedDataSaver) {
            this.applyDataSaverMode(savedDataSaver);
        }
    }

    applyDataSaverMode(enabled) {
        document.body.classList.toggle('data-saver-mode', enabled);
        
        if (enabled) {
            // Reduce image quality and disable some animations
            const images = document.querySelectorAll('img[data-src]');
            images.forEach(img => {
                if (img.dataset.srcLowQuality) {
                    img.src = img.dataset.srcLowQuality;
                }
            });
        }
    }

    confirmAdultContent(toggle) {
        const confirmed = confirm('Are you sure you want to enable adult content? This will show movies with mature themes and content.');
        if (!confirmed) {
            toggle.checked = false;
        }
    }

    updateGenrePreferences() {
        const selectedGenres = [];
        const genreCheckboxes = document.querySelectorAll('input[name="preferred_genres"]:checked');
        
        genreCheckboxes.forEach(checkbox => {
            selectedGenres.push(checkbox.value);
        });

        const message = selectedGenres.length > 0 
            ? `${selectedGenres.length} preferred genre(s) selected`
            : 'No preferred genres selected - all genres will be shown';
            
        this.showMessage(message, 'info');
    }

    validateRatingRange(minInput, maxInput) {
        const minVal = parseFloat(minInput.value);
        const maxVal = parseFloat(maxInput.value);

        if (minVal > maxVal) {
            maxInput.value = minVal;
            this.showMessage('Maximum rating adjusted to match minimum rating', 'warning');
        }
    }

    validateYearRange(minInput, maxInput) {
        const minVal = parseInt(minInput.value);
        const maxVal = parseInt(maxInput.value);

        if (minVal > maxVal) {
            maxInput.value = minVal;
            this.showMessage('Maximum year adjusted to match minimum year', 'warning');
        }
    }

    handleSettingsSubmission(e) {
        // Show loading state
        const submitButton = e.target.querySelector('button[type="submit"]');
        const originalText = submitButton.innerHTML;
        
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitButton.disabled = true;

        // Re-enable button after a delay (form will redirect on success)
        setTimeout(() => {
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }, 3000);
    }

    handleDataExport(e) {
        // Show confirmation dialog
        const confirmed = confirm('This will download all your movie data including favorites, watch history, and preferences. Continue?');
        if (!confirmed) {
            e.preventDefault();
        } else {
            this.showMessage('Preparing your data export...', 'info');
        }
    }

    showMessage(text, type = 'info') {
        // Use the existing showMessage function if available, otherwise create a simple one
        if (typeof showMessage === 'function') {
            showMessage(text, type);
        } else {
            // Simple fallback message display
            const messageDiv = document.createElement('div');
            messageDiv.className = `message message-${type}`;
            messageDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${text}`;
            
            // Insert at top of settings container
            const container = document.querySelector('.settings-container');
            if (container) {
                container.insertBefore(messageDiv, container.firstChild);
                
                // Auto-remove after 5 seconds
                setTimeout(() => {
                    messageDiv.remove();
                }, 5000);
            }
        }
    }

    // Method to reset all settings to default
    resetToDefaults() {
        if (confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
            // Clear localStorage
            localStorage.removeItem('userTheme');
            localStorage.removeItem('defaultView');
            localStorage.removeItem('moviesPerPage');
            localStorage.removeItem('dataSaverMode');
            
            // Reset form to defaults
            const form = document.querySelector('.settings-form');
            if (form) {
                form.reset();
            }
            
            // Apply default theme
            this.applyTheme('dark');
            
            this.showMessage('Settings reset to defaults!', 'success');
        }
    }
}

// Initialize settings manager when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.settingsManager = new SettingsManager();
});

// Export for global access
window.SettingsManager = SettingsManager;
