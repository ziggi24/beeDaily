// Daily Regulation Tracker - Main JavaScript

class DailyTracker {
    constructor() {
        this.schedule = null;
        this.completedTasks = new Set();
        this.storageKey = 'dailyTracker_' + this.getCurrentDateKey();
        // Default location: 39°41'51.8"N 104°53'43.9"W (converted to decimal)
        this.defaultCoordinates = {
            latitude: 39.697722,
            longitude: -104.895528
        };
        this.currentCoordinates = this.getStoredCoordinates();
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

    getStoredCoordinates() {
        const today = this.getCurrentDateKey();
        const stored = localStorage.getItem(`weather_location_${today}`);
        if (stored) {
            return JSON.parse(stored);
        }
        return this.defaultCoordinates;
    }

    setStoredCoordinates(coordinates) {
        const today = this.getCurrentDateKey();
        localStorage.setItem(`weather_location_${today}`, JSON.stringify(coordinates));
        this.currentCoordinates = coordinates;
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
        // Get current progress percentage
        const totalTasks = Object.values(this.schedule)
            .reduce((total, section) => total + section.tasks.length, 0);
        const completedCount = this.completedTasks.size;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        // Basic bounce animation
        taskElement.style.transform = 'scale(1.05)';
        setTimeout(() => {
            taskElement.style.transform = '';
        }, 200);

        // Progressive celebration based on completion percentage
        if (percentage >= 80) {
            this.createMegaCelebration(taskElement);
        } else if (percentage >= 50) {
            this.createBigCelebration(taskElement);
        } else {
            this.createBasicCelebration(taskElement);
        }

        // Special milestone celebrations
        if (percentage === 50) {
            this.showMilestoneMessage("Halfway there! 🎉", "great");
        } else if (percentage === 80) {
            this.showMilestoneMessage("Almost done! You're crushing it! 🚀", "amazing");
        } else if (percentage === 100) {
            this.showMilestoneMessage("Perfect day completed! 🏆✨", "perfect");
        }
    }

    createBasicCelebration(taskElement) {
        this.createConfetti(taskElement, {
            count: 3,
            emojis: ['✨', '⭐'],
            size: 'small',
            spread: 50
        });
    }

    createBigCelebration(taskElement) {
        this.createConfetti(taskElement, {
            count: 6,
            emojis: ['🎉', '✨', '⭐', '💫'],
            size: 'medium',
            spread: 80
        });
        
        // Add extra sparkle effect
        this.createSparkleRing(taskElement);
    }

    createMegaCelebration(taskElement) {
        this.createConfetti(taskElement, {
            count: 12,
            emojis: ['🎉', '🎊', '✨', '⭐', '💫', '🌟', '🎈'],
            size: 'large',
            spread: 120
        });
        
        // Multiple sparkle rings
        this.createSparkleRing(taskElement);
        setTimeout(() => this.createSparkleRing(taskElement), 150);
        
        // Screen flash effect
        this.createScreenFlash();
    }

    createConfetti(sourceElement, options) {
        const rect = sourceElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        for (let i = 0; i < options.count; i++) {
            setTimeout(() => {
                const emoji = options.emojis[Math.floor(Math.random() * options.emojis.length)];
                this.createFloatingEmoji(emoji, centerX, centerY, options);
            }, i * 50);
        }
    }

    createFloatingEmoji(emoji, startX, startY, options) {
        const emojiElement = document.createElement('div');
        emojiElement.textContent = emoji;
        emojiElement.className = 'floating-emoji';
        
        // Size based on options
        const sizes = {
            small: '20px',
            medium: '28px',
            large: '36px'
        };
        
        emojiElement.style.cssText = `
            position: fixed;
            left: ${startX}px;
            top: ${startY}px;
            font-size: ${sizes[options.size]};
            pointer-events: none;
            z-index: 9999;
            transform: translate(-50%, -50%);
        `;

        document.body.appendChild(emojiElement);

        // Random animation direction
        const angle = (Math.random() * options.spread - options.spread/2) * Math.PI / 180;
        const distance = 100 + Math.random() * 100;
        const endX = startX + Math.cos(angle) * distance;
        const endY = startY + Math.sin(angle) * distance - 50; // Always go up a bit

        // Animate the emoji
        emojiElement.animate([
            { 
                transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
                opacity: 1
            },
            { 
                transform: 'translate(-50%, -50%) scale(1) rotate(180deg)',
                opacity: 1,
                offset: 0.3
            },
            { 
                transform: `translate(${endX - startX}px, ${endY - startY}px) scale(0.5) rotate(360deg)`,
                opacity: 0
            }
        ], {
            duration: 1500,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });

        // Clean up
        setTimeout(() => {
            if (emojiElement.parentNode) {
                emojiElement.parentNode.removeChild(emojiElement);
            }
        }, 1500);
    }

    createSparkleRing(sourceElement) {
        const rect = sourceElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const sparkles = ['✨', '💫', '⭐'];
        const ringRadius = 60;

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * 2 * Math.PI;
            const x = centerX + Math.cos(angle) * ringRadius;
            const y = centerY + Math.sin(angle) * ringRadius;
            
            const sparkle = document.createElement('div');
            sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
            sparkle.className = 'sparkle-ring';
            sparkle.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                font-size: 16px;
                pointer-events: none;
                z-index: 9998;
                transform: translate(-50%, -50%);
            `;

            document.body.appendChild(sparkle);

            sparkle.animate([
                { 
                    transform: 'translate(-50%, -50%) scale(0) rotate(0deg)',
                    opacity: 0
                },
                { 
                    transform: 'translate(-50%, -50%) scale(1) rotate(180deg)',
                    opacity: 1,
                    offset: 0.5
                },
                { 
                    transform: 'translate(-50%, -50%) scale(0) rotate(360deg)',
                    opacity: 0
                }
            ], {
                duration: 800,
                easing: 'ease-out'
            });

            setTimeout(() => {
                if (sparkle.parentNode) {
                    sparkle.parentNode.removeChild(sparkle);
                }
            }, 800);
        }
    }

    createScreenFlash() {
        const flash = document.createElement('div');
        flash.className = 'screen-flash';
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, rgba(255,215,0,0) 70%);
            pointer-events: none;
            z-index: 9997;
        `;

        document.body.appendChild(flash);

        flash.animate([
            { opacity: 0 },
            { opacity: 1 },
            { opacity: 0 }
        ], {
            duration: 500,
            easing: 'ease-out'
        });

        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 500);
    }

    showMilestoneMessage(message, type) {
        const milestone = document.createElement('div');
        milestone.className = `milestone-message milestone-${type}`;
        milestone.textContent = message;
        
        const colors = {
            great: '#4CAF50',
            amazing: '#FF9800', 
            perfect: '#9C27B0'
        };

        milestone.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${colors[type]};
            color: white;
            padding: 20px 30px;
            border-radius: 20px;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10000;
            pointer-events: none;
        `;

        document.body.appendChild(milestone);

        milestone.animate([
            { 
                transform: 'translate(-50%, -50%) scale(0)',
                opacity: 0
            },
            { 
                transform: 'translate(-50%, -50%) scale(1.1)',
                opacity: 1,
                offset: 0.7
            },
            { 
                transform: 'translate(-50%, -50%) scale(1)',
                opacity: 1
            }
        ], {
            duration: 500,
            easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        });

        setTimeout(() => {
            milestone.animate([
                { 
                    transform: 'translate(-50%, -50%) scale(1)',
                    opacity: 1
                },
                { 
                    transform: 'translate(-50%, -50%) scale(0)',
                    opacity: 0
                }
            ], {
                duration: 300,
                easing: 'ease-in'
            });
        }, 2000);

        setTimeout(() => {
            if (milestone.parentNode) {
                milestone.parentNode.removeChild(milestone);
            }
        }, 2300);
    }

    updateProgress() {
        if (!this.schedule) return;

        const totalTasks = Object.values(this.schedule)
            .reduce((total, section) => total + section.tasks.length, 0);
        
        const completedCount = this.completedTasks.size;
        const percentage = totalTasks > 0 ? (completedCount / totalTasks) * 100 : 0;

        const progressBarFill = document.getElementById('progressBarFill');
        const progressText = document.querySelector('.progress-text');

        if (progressBarFill) {
            progressBarFill.style.width = `${percentage}%`;
            
            // Update progress bar color based on completion
            if (percentage === 100) {
                progressBarFill.style.background = 'linear-gradient(90deg, #00b894 0%, #00a085 100%)';
            } else if (percentage >= 75) {
                progressBarFill.style.background = 'linear-gradient(90deg, #fdcb6e 0%, #e17055 100%)';
            } else if (percentage >= 50) {
                progressBarFill.style.background = 'linear-gradient(90deg, #74b9ff 0%, #0984e3 100%)';
            } else {
                progressBarFill.style.background = 'linear-gradient(90deg, #fd79a8 0%, #e84393 100%)';
            }
        }

        if (progressText) {
            progressText.textContent = `${completedCount}/${totalTasks} completed`;
        }
    }

    async loadWeather() {
        const weatherContent = document.getElementById('weatherContent');
        
        try {
            // Use stored coordinates (default or user-selected)
            const { latitude, longitude } = this.currentCoordinates;

            // Fetch weather data
            const weatherData = await this.fetchWeatherData(latitude, longitude);
            
            weatherContent.innerHTML = `
                <div class="weather-info" id="weatherInfo">
                    <div class="weather-location">
                        <span class="location-name">${weatherData.location}</span>
                        <i class="fas fa-map-marker-alt location-icon"></i>
                    </div>
                    <div class="weather-top">
                        <div class="weather-icon-current">
                            <i class="fas ${this.getWeatherIcon(weatherData.condition)}"></i>
                            <div class="current-temp">
                                <span class="temp-main">${weatherData.temperature}°C</span>
                                <span class="temp-sub">${weatherData.temperatureF}°F</span>
                            </div>
                        </div>
                        <div class="weather-details">
                            <div class="weather-desc">${weatherData.description}</div>
                            <div class="weather-stats">
                                <span>UV: ${weatherData.uvIndex}</span>
                                <span>Humidity: ${weatherData.humidity}%</span>
                            </div>
                        </div>
                    </div>
                    <div class="weather-range-section">
                        <div class="range-bar-container">
                            <div class="range-bar">
                                <div class="current-marker" style="left: ${this.calculateTempPosition(weatherData.temperature, weatherData.low, weatherData.high)}%"></div>
                            </div>
                            <div class="range-labels">
                                <span class="low-temp">${weatherData.low}°C<br>${weatherData.lowF}°F</span>
                                <span class="high-temp">${weatherData.high}°C<br>${weatherData.highF}°F</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Add click event to change location
            const weatherInfo = document.getElementById('weatherInfo');
            weatherInfo.addEventListener('click', () => this.showLocationDialog());
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
        try {
            // Try to get real weather data using a free API
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,uv_index_max&timezone=auto&forecast_days=1`);
            
            if (response.ok) {
                const data = await response.json();
                const current = data.current;
                const daily = data.daily;
                
                const tempC = Math.round(current.temperature_2m);
                const tempF = Math.round((tempC * 9/5) + 32);
                const highC = Math.round(daily.temperature_2m_max[0]);
                const lowC = Math.round(daily.temperature_2m_min[0]);
                const highF = Math.round((highC * 9/5) + 32);
                const lowF = Math.round((lowC * 9/5) + 32);
                
                // Get location name from coordinates
                const locationName = await this.getLocationName(lat, lon);
                
                return {
                    temperature: tempC,
                    temperatureF: tempF,
                    high: highC,
                    low: lowC,
                    highF: highF,
                    lowF: lowF,
                    description: this.getWeatherDescription(current.weather_code),
                    condition: this.getWeatherCondition(current.weather_code),
                    uvIndex: Math.round(daily.uv_index_max[0] || 5),
                    humidity: Math.round(current.relative_humidity_2m),
                    location: locationName
                };
            }
        } catch (error) {
            console.log('Using fallback weather data:', error);
        }
        
        // Fallback to mock data
        return this.getMockWeatherData(lat, lon);
    }

    async getMockWeatherData(lat, lon) {
        const tempC = Math.round(18 + Math.random() * 15);
        const tempF = Math.round((tempC * 9/5) + 32);
        const highC = tempC + Math.round(Math.random() * 5 + 2);
        const lowC = tempC - Math.round(Math.random() * 5 + 2);
        const highF = Math.round((highC * 9/5) + 32);
        const lowF = Math.round((lowC * 9/5) + 32);
        
        const locationName = await this.getLocationName(lat, lon);
        
        return {
            temperature: tempC,
            temperatureF: tempF,
            high: highC,
            low: lowC,
            highF: highF,
            lowF: lowF,
            description: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain'][Math.floor(Math.random() * 4)],
            condition: 'clear',
            uvIndex: Math.round(1 + Math.random() * 10),
            humidity: Math.round(40 + Math.random() * 40),
            location: locationName
        };
    }

    async getLocationName(lat, lon) {
        try {
            // Use a reverse geocoding service to get location name
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            if (response.ok) {
                const data = await response.json();
                return data.city || data.locality || data.principalSubdivision || 'Unknown Location';
            }
        } catch (error) {
            console.log('Could not get location name:', error);
        }
        
        // Fallback based on coordinates
        if (Math.abs(lat - 39.697722) < 0.01 && Math.abs(lon - (-104.895528)) < 0.01) {
            return 'Denver, CO';
        }
        return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear Sky',
            1: 'Mainly Clear',
            2: 'Partly Cloudy',
            3: 'Overcast',
            45: 'Fog',
            48: 'Depositing Rime Fog',
            51: 'Light Drizzle',
            53: 'Moderate Drizzle',
            55: 'Dense Drizzle',
            61: 'Slight Rain',
            63: 'Moderate Rain',
            65: 'Heavy Rain',
            71: 'Slight Snow',
            73: 'Moderate Snow',
            75: 'Heavy Snow',
            95: 'Thunderstorm'
        };
        return descriptions[code] || 'Unknown';
    }

    getWeatherCondition(code) {
        if (code === 0 || code === 1) return 'clear';
        if (code === 2 || code === 3) return 'clouds';
        if (code >= 51 && code <= 65) return 'rain';
        if (code >= 71 && code <= 75) return 'snow';
        if (code === 95) return 'thunderstorm';
        return 'clear';
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

    calculateTempPosition(current, low, high) {
        if (high <= low) return 50; // fallback to center if invalid range
        const range = high - low;
        const position = ((current - low) / range) * 100;
        // Clamp between 0 and 100, with some padding from edges
        return Math.max(5, Math.min(95, position));
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

    async showLocationDialog() {
        const newLocation = prompt('Enter a city name or address for weather:');
        if (newLocation && newLocation.trim()) {
            try {
                const coordinates = await this.geocodeLocation(newLocation.trim());
                if (coordinates) {
                    this.setStoredCoordinates(coordinates);
                    await this.loadWeather();
                } else {
                    alert('Could not find that location. Please try again.');
                }
            } catch (error) {
                console.error('Error updating location:', error);
                alert('Error updating location. Please try again.');
            }
        }
    }

    async geocodeLocation(locationName) {
        try {
            // Use a free geocoding service
            const response = await fetch(`https://api.bigdatacloud.net/data/forward-geocode?query=${encodeURIComponent(locationName)}&key=free`);
            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    return {
                        latitude: result.latitude,
                        longitude: result.longitude
                    };
                }
            }
        } catch (error) {
            console.error('Geocoding error:', error);
        }

        // Alternative geocoding approach using OpenStreetMap Nominatim
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    return {
                        latitude: parseFloat(data[0].lat),
                        longitude: parseFloat(data[0].lon)
                    };
                }
            }
        } catch (error) {
            console.error('Alternative geocoding error:', error);
        }

        return null;
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
            // Reset location to default and refresh the page at midnight
            this.resetLocationToDefault();
            window.location.reload();
        }, msUntilMidnight);

        // Also check every minute in case the device was sleeping
        setInterval(() => {
            const currentDateKey = this.getCurrentDateKey();
            if (currentDateKey !== this.storageKey.replace('dailyTracker_', '')) {
                this.resetLocationToDefault();
                window.location.reload();
            }
        }, 60000); // Check every minute
    }

    resetLocationToDefault() {
        // Clear any stored location for previous days
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('weather_location_') && key !== `weather_location_${this.getCurrentDateKey()}`) {
                localStorage.removeItem(key);
            }
        });
        
        // Reset to default coordinates
        this.currentCoordinates = this.defaultCoordinates;
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

// App is ready to use without service worker
