// JavaScript Calendar Application
// Main application initialization and global variables

'use strict';

// Event Class Definition
class Event {
    constructor(data = {}) {
        this.id = data.id || Event.generateId();
        this.title = data.title || '';
        this.description = data.description || '';
        this.date = data.date || '';
        this.startTime = data.startTime || '';
        this.endTime = data.endTime || '';
        this.category = data.category || 'general';
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }
    
    // Generate unique ID for events
    static generateId() {
        return 'event_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // Validate event data
    validate() {
        const errors = [];
        
        if (!this.title || this.title.trim().length === 0) {
            errors.push('Event title is required');
        }
        
        if (!this.date || !Event.isValidDate(this.date)) {
            errors.push('Valid event date is required');
        }
        
        if (this.startTime && !Event.isValidTime(this.startTime)) {
            errors.push('Invalid start time format');
        }
        
        if (this.endTime && !Event.isValidTime(this.endTime)) {
            errors.push('Invalid end time format');
        }
        
        if (this.startTime && this.endTime && this.startTime >= this.endTime) {
            errors.push('End time must be after start time');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
    
    // Validate date format (YYYY-MM-DD)
    static isValidDate(dateString) {
        if (!dateString) return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
    }
    
    // Validate time format (HH:MM)
    static isValidTime(timeString) {
        if (!timeString) return true; // Time is optional
        const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return regex.test(timeString);
    }
    
    // Update event data
    update(data) {
        Object.keys(data).forEach(key => {
            if (key !== 'id' && key !== 'createdAt' && this.hasOwnProperty(key)) {
                this[key] = data[key];
            }
        });
        this.updatedAt = new Date().toISOString();
    }
    
    // Convert to JSON for storage
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            description: this.description,
            date: this.date,
            startTime: this.startTime,
            endTime: this.endTime,
            category: this.category,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
    
    // Create Event from JSON data
    static fromJSON(jsonData) {
        return new Event(jsonData);
    }
    
    // Get formatted display time
    getDisplayTime() {
        if (!this.startTime) return '';
        
        let timeStr = this.startTime;
        if (this.endTime) {
            timeStr += ` - ${this.endTime}`;
        }
        
        return timeStr;
    }
    
    // Check if event is all-day
    isAllDay() {
        return !this.startTime && !this.endTime;
    }
}

// EventManager Class for CRUD operations
class EventManager {
    constructor() {
        this.events = new Map(); // Use Map for efficient lookups
        this.eventsByDate = new Map(); // Index events by date for quick calendar rendering
    }
    
    // Create a new event
    create(eventData) {
        const event = new Event(eventData);
        const validation = event.validate();
        
        if (!validation.isValid) {
            throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
        }
        
        this.events.set(event.id, event);
        this.indexEventByDate(event);
        
        return event;
    }
    
    // Get event by ID
    getById(id) {
        return this.events.get(id) || null;
    }
    
    // Get all events
    getAll() {
        return Array.from(this.events.values());
    }
    
    // Get events for a specific date
    getByDate(date) {
        return this.eventsByDate.get(date) || [];
    }
    
    // Get events for a date range
    getByDateRange(startDate, endDate) {
        const events = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateKey = DateUtils.formatDate(d.getFullYear(), d.getMonth(), d.getDate());
            const dayEvents = this.getByDate(dateKey);
            events.push(...dayEvents);
        }
        
        return events;
    }
    
    // Update an existing event
    update(id, eventData) {
        const event = this.events.get(id);
        if (!event) {
            throw new Error(`Event with ID ${id} not found`);
        }
        
        // Remove from old date index if date is changing
        const oldDate = event.date;
        event.update(eventData);
        
        const validation = event.validate();
        if (!validation.isValid) {
            throw new Error(`Event validation failed: ${validation.errors.join(', ')}`);
        }
        
        // Update date index if date changed
        if (oldDate !== event.date) {
            this.removeEventFromDateIndex(event.id, oldDate);
            this.indexEventByDate(event);
        }
        
        return event;
    }
    
    // Delete an event
    delete(id) {
        const event = this.events.get(id);
        if (!event) {
            throw new Error(`Event with ID ${id} not found`);
        }
        
        this.events.delete(id);
        this.removeEventFromDateIndex(id, event.date);
        
        return true;
    }
    
    // Get events by category
    getByCategory(category) {
        return this.getAll().filter(event => event.category === category);
    }
    
    // Search events by title or description
    search(query) {
        const searchTerm = query.toLowerCase();
        return this.getAll().filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm)
        );
    }
    
    // Get event count for a date
    getEventCountForDate(date) {
        const events = this.getByDate(date);
        return events.length;
    }
    
    // Check if a date has events
    hasEventsOnDate(date) {
        return this.getEventCountForDate(date) > 0;
    }
    
    // Private method to index events by date
    indexEventByDate(event) {
        if (!this.eventsByDate.has(event.date)) {
            this.eventsByDate.set(event.date, []);
        }
        
        const dateEvents = this.eventsByDate.get(event.date);
        // Remove existing event if updating
        const existingIndex = dateEvents.findIndex(e => e.id === event.id);
        if (existingIndex !== -1) {
            dateEvents[existingIndex] = event;
        } else {
            dateEvents.push(event);
        }
        
        // Sort events by start time
        dateEvents.sort((a, b) => {
            if (!a.startTime && !b.startTime) return 0;
            if (!a.startTime) return -1;
            if (!b.startTime) return 1;
            return a.startTime.localeCompare(b.startTime);
        });
    }
    
    // Private method to remove event from date index
    removeEventFromDateIndex(eventId, date) {
        if (!this.eventsByDate.has(date)) return;
        
        const dateEvents = this.eventsByDate.get(date);
        const index = dateEvents.findIndex(e => e.id === eventId);
        if (index !== -1) {
            dateEvents.splice(index, 1);
        }
        
        // Clean up empty date entries
        if (dateEvents.length === 0) {
            this.eventsByDate.delete(date);
        }
    }
    
    // Export all events to JSON
    exportToJSON() {
        return {
            events: this.getAll().map(event => event.toJSON()),
            exportDate: new Date().toISOString()
        };
    }
    
    // Import events from JSON
    importFromJSON(jsonData) {
        if (!jsonData.events || !Array.isArray(jsonData.events)) {
            throw new Error('Invalid JSON format for events import');
        }
        
        const importedEvents = [];
        const errors = [];
        
        jsonData.events.forEach((eventData, index) => {
            try {
                const event = Event.fromJSON(eventData);
                const validation = event.validate();
                
                if (validation.isValid) {
                    this.events.set(event.id, event);
                    this.indexEventByDate(event);
                    importedEvents.push(event);
                } else {
                    errors.push(`Event ${index + 1}: ${validation.errors.join(', ')}`);
                }
            } catch (error) {
                errors.push(`Event ${index + 1}: ${error.message}`);
            }
        });
        
        return {
            imported: importedEvents.length,
            errors: errors
        };
    }
    
    // Clear all events
    clear() {
        this.events.clear();
        this.eventsByDate.clear();
    }
    
    // Get statistics
    getStatistics() {
        const events = this.getAll();
        const categories = {};
        
        events.forEach(event => {
            categories[event.category] = (categories[event.category] || 0) + 1;
        });
        
        return {
            totalEvents: events.length,
            categoryCounts: categories,
            datesWithEvents: this.eventsByDate.size
        };
    }
}

// Date Utility Functions
const DateUtils = {
    // Get number of days in a specific month/year
    getDaysInMonth(year, month) {
        return new Date(year, month + 1, 0).getDate();
    },
    
    // Get the first day of week for a month (0 = Sunday, 6 = Saturday)
    getFirstDayOfMonth(year, month) {
        return new Date(year, month, 1).getDay();
    },
    
    // Get previous month/year
    getPreviousMonth(year, month) {
        if (month === 0) {
            return { year: year - 1, month: 11 };
        }
        return { year: year, month: month - 1 };
    },
    
    // Get next month/year
    getNextMonth(year, month) {
        if (month === 11) {
            return { year: year + 1, month: 0 };
        }
        return { year: year, month: month + 1 };
    },
    
    // Check if a year is a leap year
    isLeapYear(year) {
        return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
    },
    
    // Format date as YYYY-MM-DD
    formatDate(year, month, day) {
        const mm = String(month + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    },
    
    // Parse date string back to components
    parseDate(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return { year, month: month - 1, day };
    },
    
    // Check if two dates are the same
    isSameDate(date1, date2) {
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    },
    
    // Check if a date is today
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() &&
               month === today.getMonth() &&
               day === today.getDate();
    },
    
    // Get month name
    getMonthName(month) {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month];
    },
    
    // Get abbreviated day names
    getDayNames() {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    },
    
    // Generate calendar grid data for a given month
    generateCalendarData(year, month) {
        const daysInMonth = this.getDaysInMonth(year, month);
        const firstDay = this.getFirstDayOfMonth(year, month);
        const prevMonth = this.getPreviousMonth(year, month);
        const nextMonth = this.getNextMonth(year, month);
        const daysInPrevMonth = this.getDaysInMonth(prevMonth.year, prevMonth.month);
        
        const calendarData = [];
        let week = [];
        
        // Add previous month's trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            week.push({
                day: daysInPrevMonth - i,
                month: prevMonth.month,
                year: prevMonth.year,
                isCurrentMonth: false,
                isPrevMonth: true,
                isNextMonth: false
            });
        }
        
        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            week.push({
                day: day,
                month: month,
                year: year,
                isCurrentMonth: true,
                isPrevMonth: false,
                isNextMonth: false,
                isToday: this.isToday(year, month, day)
            });
            
            // If week is complete, add to calendar data
            if (week.length === 7) {
                calendarData.push([...week]);
                week = [];
            }
        }
        
        // Add next month's leading days to complete the grid
        let nextDay = 1;
        while (week.length < 7) {
            week.push({
                day: nextDay,
                month: nextMonth.month,
                year: nextMonth.year,
                isCurrentMonth: false,
                isPrevMonth: false,
                isNextMonth: true
            });
            nextDay++;
        }
        
        // Add final week if it exists
        if (week.length > 0) {
            calendarData.push([...week]);
        }
        
        return calendarData;
    }
};

// Application state
const CalendarApp = {
    currentDate: new Date(),
    eventManager: new EventManager(),
    
    // Initialize the application
    init() {
        console.log('Calendar application initializing...');
        this.setupEventListeners();
        this.renderCalendar();
        console.log('Calendar application ready!');
    },
    
    // Set up global event listeners
    setupEventListeners() {
        // DOM content loaded listener
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded');
        });
        
        // Month navigation buttons
        const prevButton = document.getElementById('prev-month');
        const nextButton = document.getElementById('next-month');
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.navigateToPreviousMonth();
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.navigateToNextMonth();
            });
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            } else if (e.key === 'ArrowLeft' && e.ctrlKey) {
                this.navigateToPreviousMonth();
            } else if (e.key === 'ArrowRight' && e.ctrlKey) {
                this.navigateToNextMonth();
            }
        });
        
        // Modal overlay click to close
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
    },
    
    // Modal management functions
    showModal(content) {
        const modalOverlay = document.getElementById('modal-overlay');
        const modal = modalOverlay.querySelector('.modal');
        
        modal.innerHTML = content;
        modalOverlay.classList.remove('hidden');
        
        // Focus management for accessibility
        const firstFocusable = modal.querySelector('input, button, textarea, select');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    },
    
    closeModal() {
        const modalOverlay = document.getElementById('modal-overlay');
        modalOverlay.classList.add('hidden');
    },
    
    // Navigation methods
    navigateToPreviousMonth() {
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        const prevMonth = DateUtils.getPreviousMonth(currentYear, currentMonth);
        
        this.currentDate = new Date(prevMonth.year, prevMonth.month, 1);
        this.renderCalendar();
    },
    
    navigateToNextMonth() {
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        const nextMonth = DateUtils.getNextMonth(currentYear, currentMonth);
        
        this.currentDate = new Date(nextMonth.year, nextMonth.month, 1);
        this.renderCalendar();
    },
    
    // Calendar rendering
    renderCalendar() {
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        
        // Update month/year display
        this.updateMonthYearDisplay(currentYear, currentMonth);
        
        // Generate calendar data
        const calendarData = DateUtils.generateCalendarData(currentYear, currentMonth);
        
        // Render calendar dates
        this.renderCalendarDates(calendarData);
    },
    
    updateMonthYearDisplay(year, month) {
        const monthYearElement = document.getElementById('current-month-year');
        if (monthYearElement) {
            const monthName = DateUtils.getMonthName(month);
            monthYearElement.textContent = `${monthName} ${year}`;
        }
    },
    
    renderCalendarDates(calendarData) {
        const calendarDatesContainer = document.getElementById('calendar-dates');
        if (!calendarDatesContainer) return;
        
        // Clear existing dates
        calendarDatesContainer.innerHTML = '';
        
        // Render each week
        calendarData.forEach(week => {
            week.forEach(dateObj => {
                const dateElement = this.createDateElement(dateObj);
                calendarDatesContainer.appendChild(dateElement);
            });
        });
    },
    
    createDateElement(dateObj) {
        const dateElement = document.createElement('div');
        dateElement.classList.add('calendar-date');
        dateElement.textContent = dateObj.day;
        
        // Add appropriate classes
        if (!dateObj.isCurrentMonth) {
            dateElement.classList.add('other-month');
        }
        
        if (dateObj.isToday) {
            dateElement.classList.add('today');
        }
        
        // Check for events on this date
        const dateKey = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        const hasEvents = this.eventManager.hasEventsOnDate(dateKey);
        
        if (hasEvents) {
            dateElement.classList.add('has-events');
        }
        
        // Store date information for event handling
        dateElement.dataset.year = dateObj.year;
        dateElement.dataset.month = dateObj.month;
        dateElement.dataset.day = dateObj.day;
        dateElement.dataset.isCurrentMonth = dateObj.isCurrentMonth;
        
        // Add ARIA attributes for accessibility
        const formattedDate = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        dateElement.setAttribute('role', 'gridcell');
        dateElement.setAttribute('aria-label', `${dateObj.day} ${DateUtils.getMonthName(dateObj.month)} ${dateObj.year}`);
        dateElement.setAttribute('tabindex', dateObj.isCurrentMonth ? '0' : '-1');
        
        // Add click event listener
        dateElement.addEventListener('click', (e) => {
            this.handleDateClick(e, dateObj);
        });
        
        // Add keyboard event listener for accessibility
        dateElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.handleDateClick(e, dateObj);
            }
        });
        
        return dateElement;
    },
    
    // Date click handler
    handleDateClick(event, dateObj) {
        console.log('Date clicked:', dateObj);
        
        // If clicking on a date from another month, navigate to that month
        if (!dateObj.isCurrentMonth) {
            this.currentDate = new Date(dateObj.year, dateObj.month, 1);
            this.renderCalendar();
            return;
        }
        
        // Highlight selected date
        this.highlightSelectedDate(event.target);
        
        // Store selected date for potential event creation
        this.selectedDate = {
            year: dateObj.year,
            month: dateObj.month,
            day: dateObj.day,
            element: event.target
        };
        
        // For now, show a simple indication that the date was selected
        // This will be expanded when we implement event creation modal
        const formattedDate = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        console.log(`Selected date: ${formattedDate}`);
        
        // Placeholder for event creation - will be implemented in Task 9
        // this.showEventCreationModal(dateObj);
    },
    
    highlightSelectedDate(dateElement) {
        // Remove previous selection
        const previousSelected = document.querySelector('.calendar-date.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Highlight new selection
        dateElement.classList.add('selected');
    }
};

// Initialize the application when the script loads
CalendarApp.init();