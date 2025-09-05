// Daily Regulation Tracker - Main JavaScript

class DailyTracker {
    constructor() {
        this.schedule = null;
        this.completedTasks = new Set();
        this.storageKey = 'dailyTracker_' + this.getCurrentDateKey();
        this.init();
    }

    async init() {
        await this.loadSchedule();
        this.loadCompletedTasks();
        this.renderSchedule();
        this.updateDateDisplay();
        this.loadWeather();
        this.loadDailyQuote();
        this.updateProgress();
        this.setupEventListeners();
        this.setupMidnightRefresh();
    }

    getCurrentDateKey() {
        return new Date().toISOString().split('T')[0];
    }

    updateDateDisplay() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        const dateString = now.toLocaleDateString('en-US', options);
        document.getElementById('dateDisplay').textContent = dateString;
    }

    async loadSchedule() {
        try {
            const response = await fetch('./assets/schedule.json');
            this.schedule = await response.json();
        } catch (error) {
            console.error('Failed to load schedule:', error);
            this.showError('Failed to load schedule data');
        }
    }

    loadCompletedTasks() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            this.completedTasks = new Set(JSON.parse(saved));
        }
    }

    saveCompletedTasks() {
        localStorage.setItem(this.storageKey, JSON.stringify([...this.completedTasks]));
    }

    renderSchedule() {
        if (!this.schedule) return;

        const container = document.getElementById('scheduleContainer');
        container.innerHTML = '';

        Object.keys(this.schedule).forEach((timeOfDay, index) => {
            const section = this.schedule[timeOfDay];
            const sectionElement = this.createScheduleSection(timeOfDay, section);
            container.appendChild(sectionElement);
        });
    }

    createScheduleSection(timeOfDay, section) {
        const sectionDiv = document.createElement('div');
        sectionDiv.className = `schedule-section ${timeOfDay}`;

        const header = document.createElement('div');
        header.className = 'section-header';
        header.innerHTML = `
            <i class="fas ${section.icon}"></i>
            <span>${section.title}</span>
        `;

        const taskList = document.createElement('ul');
        taskList.className = 'task-list';

        section.tasks.forEach(task => {
            const taskItem = this.createTaskItem(task);
            taskList.appendChild(taskItem);
        });

        sectionDiv.appendChild(header);
        sectionDiv.appendChild(taskList);

        return sectionDiv;
    }

    createTaskItem(task) {
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.taskId = task.id;

        const isCompleted = this.completedTasks.has(task.id);
        if (isCompleted) {
            li.classList.add('completed');
        }

        li.innerHTML = `
            <div class="task-checkbox ${isCompleted ? 'checked' : ''}">
                ${isCompleted ? '<i class="fas fa-check"></i>' : ''}
            </div>
            <div class="task-icon">
                <i class="fas ${task.icon}"></i>
            </div>
            <span class="task-text">${task.text}</span>
        `;

        li.addEventListener('click', () => this.toggleTask(task.id));

        return li;
    }

    toggleTask(taskId) {
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        const checkbox = taskElement.querySelector('.task-checkbox');

        if (this.completedTasks.has(taskId)) {
            this.completedTasks.delete(taskId);
            taskElement.classList.remove('completed');
            checkbox.classList.remove('checked');
            checkbox.innerHTML = '';
        } else {
            this.completedTasks.add(taskId);
            taskElement.classList.add('completed');
            checkbox.classList.add('checked');
            checkbox.innerHTML = '<i class="fas fa-check"></i>';
            
            // Add celebration animation
            this.celebrateTaskCompletion(taskElement);
        }

        this.saveCompletedTasks();
        this.updateProgress();
    }

    celebrateTaskCompletion(taskElement) {
        taskElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
            taskElement.style.transform = '';
        }, 200);
    }

    updateProgress() {
        if (!this.schedule) return;

        const totalTasks = Object.values(this.schedule)
            .reduce((total, section) => total + section.tasks.length, 0);
        
        const completedCount = this.completedTasks.size;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        const progressBar = document.getElementById('overallProgress');
        const progressText = document.querySelector('.progress-text');

        if (progressBar) {
            progressBar.value = percentage;
        }

        if (progressText) {
            progressText.textContent = `${completedCount}/${totalTasks} completed`;
        }

        // Update progress bar color based on completion
        if (progressBar) {
            if (percentage === 100) {
                progressBar.style.setProperty('--wa-color-primary-600', '#00b894');
            } else if (percentage >= 75) {
                progressBar.style.setProperty('--wa-color-primary-600', '#fdcb6e');
            } else {
                progressBar.style.setProperty('--wa-color-primary-600', '#74b9ff');
            }
        }
    }

    async loadWeather() {
        const weatherContent = document.getElementById('weatherContent');
        
        try {
            // Get user's location
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            // Fetch weather data (using OpenWeatherMap API - you'll need to get a free API key)
            // For demo purposes, we'll use mock data
            const weatherData = await this.fetchWeatherData(latitude, longitude);
            
            weatherContent.innerHTML = `
                <div class="weather-info">
                    <div class="weather-main">
                        <i class="fas ${this.getWeatherIcon(weatherData.condition)}"></i>
                        <div class="weather-temps">
                            <div class="weather-current">
                                <span class="temp-c">${weatherData.temperature}°C</span>
                                <span class="temp-divider">/</span>
                                <span class="temp-f">${weatherData.temperatureF}°F</span>
                            </div>
                            <div class="weather-desc">${weatherData.description}</div>
                            <div class="weather-range">H: ${weatherData.high}°C / L: ${weatherData.low}°C</div>
                        </div>
                    </div>
                    <div class="weather-details">
                        <div>UV: ${weatherData.uvIndex}</div>
                        <div>Humidity: ${weatherData.humidity}%</div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Weather loading failed:', error);
            weatherContent.innerHTML = `
                <i class="fas fa-cloud"></i>
                <span>Weather unavailable</span>
            `;
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 10000,
                enableHighAccuracy: false
            });
        });
    }

    async fetchWeatherData(lat, lon) {
        // This is a mock implementation
        // In a real app, you'd use a weather API like OpenWeatherMap
        // Example: `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=YOUR_API_KEY&units=metric`
        
        return new Promise(resolve => {
            setTimeout(() => {
                const tempC = Math.round(18 + Math.random() * 15);
                const tempF = Math.round((tempC * 9/5) + 32);
                const highC = tempC + Math.round(Math.random() * 5 + 2);
                const lowC = tempC - Math.round(Math.random() * 5 + 2);
                
                resolve({
                    temperature: tempC,
                    temperatureF: tempF,
                    high: highC,
                    low: lowC,
                    description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
                    condition: 'clear',
                    uvIndex: Math.round(1 + Math.random() * 10),
                    humidity: Math.round(40 + Math.random() * 40)
                });
            }, 1500);
        });
    }

    getWeatherIcon(condition) {
        const icons = {
            clear: 'fa-sun',
            clouds: 'fa-cloud',
            rain: 'fa-cloud-rain',
            snow: 'fa-snowflake',
            thunderstorm: 'fa-bolt'
        };
        return icons[condition] || 'fa-sun';
    }

    async loadDailyQuote() {
        const quoteContent = document.getElementById('quoteContent');
        
        try {
            const quote = await this.fetchDailyQuote();
            quoteContent.innerHTML = `
                <div class="quote-text">"${quote.text}"</div>
                <div class="quote-author">— ${quote.author}</div>
            `;
        } catch (error) {
            console.error('Quote loading failed:', error);
            quoteContent.innerHTML = `
                <div class="quote-text">"Every day is a new beginning. Take a deep breath and start again."</div>
                <div class="quote-author">— Anonymous</div>
            `;
        }
    }

    async fetchDailyQuote() {
        // Mock daily quotes for demonstration
        const quotes = [
            {
                text: "Progress, not perfection, is the goal.",
                author: "Self-Care Wisdom"
            },
            {
                text: "Small steps daily lead to big changes yearly.",
                author: "James Clear"
            },
            {
                text: "You don't have to be perfect, you just have to be consistent.",
                author: "Daily Motivation"
            },
            {
                text: "Self-care is not selfish. You cannot serve from an empty vessel.",
                author: "Eleanor Brown"
            },
            {
                text: "The secret of getting ahead is getting started.",
                author: "Mark Twain"
            },
            {
                text: "Your only limit is your mind.",
                author: "Motivational"
            },
            {
                text: "Every accomplishment starts with the decision to try.",
                author: "Gail Devers"
            }
        ];

        // Use date as seed for consistent daily quote
        const dateKey = this.getCurrentDateKey();
        const quoteIndex = this.hashCode(dateKey) % quotes.length;
        
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(quotes[Math.abs(quoteIndex)]);
            }, 1000);
        });
    }

    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash;
    }

    setupEventListeners() {
        const resetButton = document.getElementById('resetButton');
        if (resetButton) {
            resetButton.addEventListener('click', () => this.resetDay());
        }
    }

    resetDay() {
        if (confirm('Are you sure you want to reset all tasks for today?')) {
            this.completedTasks.clear();
            localStorage.removeItem(this.storageKey);
            this.renderSchedule();
            this.updateProgress();
        }
    }

    setupMidnightRefresh() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();

        setTimeout(() => {
            // Refresh the page at midnight
            window.location.reload();
        }, msUntilMidnight);

        // Also check every minute in case the device was sleeping
        setInterval(() => {
            const currentDateKey = this.getCurrentDateKey();
            if (currentDateKey !== this.storageKey.replace('dailyTracker_', '')) {
                window.location.reload();
            }
        }, 60000); // Check every minute
    }

    showError(message) {
        console.error(message);
        // You could implement a toast notification here
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DailyTracker();
});

// Service Worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
