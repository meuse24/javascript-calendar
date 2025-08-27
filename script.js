// JavaScript Calendar Application
// Main application initialization and global variables

'use strict';

// Input Sanitization Utility
class InputSanitizer {
    static sanitizeText(input) {
        if (typeof input !== 'string') return '';
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/\s+/g, ' ') // Normalize whitespace
            .substring(0, 1000); // Limit length
    }
    
    static sanitizeHTML(input) {
        if (typeof input !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }
    
    static validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    static validateURL(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

// Enhanced Validation System
class FormValidator {
    static rules = {
        required: (value) => value !== null && value !== undefined && String(value).trim().length > 0,
        minLength: (value, min) => String(value).length >= min,
        maxLength: (value, max) => String(value).length <= max,
        email: (value) => InputSanitizer.validateEmail(value),
        url: (value) => InputSanitizer.validateURL(value),
        date: (value) => Event.isValidDate(value),
        time: (value) => Event.isValidTime(value),
        numeric: (value) => !isNaN(Number(value)),
        pattern: (value, pattern) => new RegExp(pattern).test(value)
    };
    
    static validate(value, rules, fieldName = '') {
        const errors = [];
        
        for (const rule of rules) {
            const [ruleName, ...params] = rule.split(':');
            const ruleFunction = this.rules[ruleName];
            
            if (!ruleFunction) {
                errors.push(`Unknown validation rule: ${ruleName}`);
                continue;
            }
            
            const isValid = params.length > 0 
                ? ruleFunction(value, ...params)
                : ruleFunction(value);
                
            if (!isValid) {
                errors.push(this.getErrorMessage(ruleName, fieldName, params));
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    static getErrorMessage(rule, fieldName, params) {
        const messages = {
            required: `${fieldName} is required`,
            minLength: `${fieldName} must be at least ${params[0]} characters`,
            maxLength: `${fieldName} must be no more than ${params[0]} characters`,
            email: `Please enter a valid email address`,
            url: `Please enter a valid URL`,
            date: `Please enter a valid date`,
            time: `Please enter a valid time`,
            numeric: `${fieldName} must be a number`,
            pattern: `${fieldName} format is invalid`
        };
        
        return messages[rule] || `${fieldName} is invalid`;
    }
    
    static validateForm(formData, schema) {
        const results = {};
        let isFormValid = true;
        
        for (const [fieldName, rules] of Object.entries(schema)) {
            const value = formData[fieldName];
            const validation = this.validate(value, rules, fieldName);
            
            results[fieldName] = validation;
            if (!validation.isValid) {
                isFormValid = false;
            }
        }
        
        return {
            isValid: isFormValid,
            fields: results
        };
    }
}

// Event Class Definition
class Event {
    constructor(data = {}) {
        this.id = data.id || Event.generateId();
        this.title = InputSanitizer.sanitizeText(data.title || '');
        this.description = InputSanitizer.sanitizeText(data.description || '');
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
    constructor(storageManager = null) {
        this.events = new Map(); // Use Map for efficient lookups
        this.eventsByDate = new Map(); // Index events by date for quick calendar rendering
        this.storageManager = storageManager;
        
        // Load existing events from storage
        this.loadFromStorage();
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
        this.saveToStorage();
        
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
        
        this.saveToStorage();
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
        this.saveToStorage();
        
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
        this.saveToStorage();
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
    
    // Storage integration methods
    saveToStorage() {
        if (!this.storageManager) return false;
        
        try {
            const eventsData = this.exportToJSON();
            return this.storageManager.save(eventsData);
        } catch (error) {
            console.error('Failed to save events to storage:', error);
            return false;
        }
    }
    
    loadFromStorage() {
        if (!this.storageManager) return false;
        
        try {
            const eventsData = this.storageManager.load();
            if (!eventsData) return false; // No data to load
            
            // Clear current events
            this.events.clear();
            this.eventsByDate.clear();
            
            // Import loaded events
            const result = this.importFromJSON(eventsData);
            
            if (result.errors.length > 0) {
                console.warn('Some events failed to load:', result.errors);
            }
            
            console.log(`Loaded ${result.imported} events from storage`);
            return true;
        } catch (error) {
            console.error('Failed to load events from storage:', error);
            return false;
        }
    }
    
    // Get storage status and info
    getStorageStatus() {
        if (!this.storageManager) {
            return {
                enabled: false,
                supported: false,
                info: null
            };
        }
        
        return {
            enabled: true,
            supported: this.storageManager.isStorageSupported,
            info: this.storageManager.getStorageInfo()
        };
    }
    
    // Create backup download
    downloadBackup() {
        if (!this.storageManager) {
            console.warn('Storage manager not available for backup');
            return false;
        }
        
        return this.storageManager.exportData();
    }
    
    // Restore from uploaded backup file
    async restoreFromFile(file) {
        if (!this.storageManager) {
            throw new Error('Storage manager not available for restore');
        }
        
        try {
            const success = await this.storageManager.importData(file);
            if (success) {
                // Reload events from storage after successful import
                this.loadFromStorage();
            }
            return success;
        } catch (error) {
            console.error('Failed to restore from file:', error);
            throw error;
        }
    }
}

// StorageManager Class for localStorage integration
class StorageManager {
    constructor(storageKey = 'calendar_events') {
        this.storageKey = storageKey;
        this.version = '1.0';
        this.versionKey = `${storageKey}_version`;
        
        // Check for storage support
        this.isStorageSupported = this.checkStorageSupport();
        
        // Initialize storage version tracking
        this.initializeVersioning();
    }
    
    // Check if localStorage is supported and available
    checkStorageSupport() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (e) {
            console.warn('localStorage is not supported or is disabled:', e);
            return false;
        }
    }
    
    // Initialize version tracking for data migration
    initializeVersioning() {
        if (!this.isStorageSupported) return;
        
        const storedVersion = localStorage.getItem(this.versionKey);
        if (!storedVersion) {
            localStorage.setItem(this.versionKey, this.version);
        } else if (storedVersion !== this.version) {
            console.log(`Data version mismatch. Stored: ${storedVersion}, Current: ${this.version}`);
            // Handle data migration if needed in future versions
        }
    }
    
    // Save data to localStorage
    save(data) {
        if (!this.isStorageSupported) {
            console.warn('Cannot save data: localStorage not supported');
            return false;
        }
        
        try {
            const serializedData = JSON.stringify({
                data: data,
                timestamp: new Date().toISOString(),
                version: this.version
            });
            
            localStorage.setItem(this.storageKey, serializedData);
            return true;
        } catch (error) {
            console.error('Failed to save data to localStorage:', error);
            
            // Handle storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            }
            
            return false;
        }
    }
    
    // Load data from localStorage
    load() {
        if (!this.isStorageSupported) {
            console.warn('Cannot load data: localStorage not supported');
            return null;
        }
        
        try {
            const serializedData = localStorage.getItem(this.storageKey);
            if (!serializedData) {
                return null; // No data stored yet
            }
            
            const parsedData = JSON.parse(serializedData);
            
            // Validate data structure
            if (!parsedData.data || !parsedData.timestamp || !parsedData.version) {
                console.warn('Invalid data structure in localStorage');
                return null;
            }
            
            // Check data freshness (optional - could implement expiration)
            const dataAge = Date.now() - new Date(parsedData.timestamp).getTime();
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
            
            if (dataAge > maxAge) {
                console.log('Stored data is older than 30 days');
                // Could choose to clear old data or migrate it
            }
            
            return parsedData.data;
        } catch (error) {
            console.error('Failed to load data from localStorage:', error);
            
            // Handle corrupted data
            this.handleCorruptedData();
            return null;
        }
    }
    
    // Clear all stored data
    clear() {
        if (!this.isStorageSupported) {
            console.warn('Cannot clear data: localStorage not supported');
            return false;
        }
        
        try {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.versionKey);
            return true;
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
            return false;
        }
    }
    
    // Get storage usage information
    getStorageInfo() {
        if (!this.isStorageSupported) {
            return null;
        }
        
        try {
            const data = localStorage.getItem(this.storageKey);
            const dataSize = data ? new Blob([data]).size : 0;
            
            // Estimate total localStorage usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            return {
                dataSize: dataSize,
                totalSize: totalSize,
                keyCount: localStorage.length,
                isSupported: true
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return null;
        }
    }
    
    // Create backup of current data
    createBackup() {
        const data = this.load();
        if (!data) return null;
        
        const backup = {
            data: data,
            backupDate: new Date().toISOString(),
            version: this.version
        };
        
        return JSON.stringify(backup, null, 2);
    }
    
    // Restore from backup
    restoreFromBackup(backupString) {
        try {
            const backup = JSON.parse(backupString);
            
            if (!backup.data || !backup.backupDate || !backup.version) {
                throw new Error('Invalid backup format');
            }
            
            return this.save(backup.data);
        } catch (error) {
            console.error('Failed to restore from backup:', error);
            return false;
        }
    }
    
    // Handle storage quota exceeded
    handleStorageQuotaExceeded() {
        console.warn('localStorage quota exceeded');
        
        // Could implement cleanup strategies:
        // 1. Remove oldest data
        // 2. Compress data
        // 3. Prompt user to clear some data
        
        // For now, just log the issue
        const info = this.getStorageInfo();
        if (info) {
            console.log(`Current storage usage: ${info.totalSize} bytes`);
        }
    }
    
    // Handle corrupted data
    handleCorruptedData() {
        console.warn('Corrupted data detected in localStorage');
        
        // Could implement recovery strategies:
        // 1. Try to parse partial data
        // 2. Reset to default state
        // 3. Prompt user for action
        
        // For now, clear the corrupted data
        const shouldClear = confirm('Corrupted data detected. Clear stored data and start fresh?');
        if (shouldClear) {
            this.clear();
        }
    }
    
    // Export data for download
    exportData() {
        const data = this.createBackup();
        if (!data) return null;
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        return true;
    }
    
    // Import data from file
    importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const success = this.restoreFromBackup(e.target.result);
                    resolve(success);
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }
}

// Austrian Holiday Calculator
class AustrianHolidays {
    // Fixed holidays (same date every year)
    static fixedHolidays = [
        { month: 1, day: 1, name: 'Neujahr' },
        { month: 1, day: 6, name: 'Heilige Drei Könige' },
        { month: 5, day: 1, name: 'Staatsfeiertag' },
        { month: 8, day: 15, name: 'Mariä Himmelfahrt' },
        { month: 10, day: 26, name: 'Nationalfeiertag' },
        { month: 11, day: 1, name: 'Allerheiligen' },
        { month: 12, day: 8, name: 'Mariä Empfängnis' },
        { month: 12, day: 25, name: 'Christtag' },
        { month: 12, day: 26, name: 'Stefanitag' }
    ];
    
    // Calculate Easter date using Gauss formula
    static calculateEaster(year) {
        // Gaußsche Osterformel für gregorianischen Kalender
        const k = Math.floor(year / 100);
        const m = 15 + Math.floor((3 * k + 3) / 4) - Math.floor((8 * k + 13) / 25);
        const s = 2 - Math.floor((3 * k + 3) / 4);
        const a = year % 19;
        const d = (19 * a + m) % 30;
        const r = Math.floor((d + Math.floor(a / 11)) / 29);
        const og = 21 + d - r;
        const sz = 7 - (year + Math.floor(year / 4) + s) % 7;
        const oe = 7 - (og - sz) % 7;
        let day = og + oe;
        let month = 3; // March
        
        if (day > 31) {
            month = 4; // April
            day -= 31;
        }
        
        return new Date(year, month - 1, day); // JavaScript months are 0-indexed
    }
    
    // Get all variable holidays for a given year (based on Easter)
    static getVariableHolidays(year) {
        const easter = this.calculateEaster(year);
        const holidays = [];
        
        // Variable holidays relative to Easter
        const variableHolidays = [
            { offset: -2, name: 'Karfreitag' },
            { offset: 0, name: 'Ostersonntag' },
            { offset: 1, name: 'Ostermontag' },
            { offset: 39, name: 'Christi Himmelfahrt' },
            { offset: 49, name: 'Pfingstsonntag' },
            { offset: 50, name: 'Pfingstmontag' },
            { offset: 60, name: 'Fronleichnam' }
        ];
        
        variableHolidays.forEach(holiday => {
            const date = new Date(easter);
            date.setDate(easter.getDate() + holiday.offset);
            holidays.push({
                date: date,
                name: holiday.name,
                type: 'variable'
            });
        });
        
        return holidays;
    }
    
    // Check if a given date is a holiday
    static isHoliday(date) {
        if (!(date instanceof Date)) return null;
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // Convert to 1-indexed
        const day = date.getDate();
        
        // Check fixed holidays
        const fixedHoliday = this.fixedHolidays.find(h => 
            h.month === month && h.day === day
        );
        if (fixedHoliday) {
            return { name: fixedHoliday.name, type: 'fixed' };
        }
        
        // Check variable holidays
        const variableHolidays = this.getVariableHolidays(year);
        const variableHoliday = variableHolidays.find(h => 
            h.date.getFullYear() === date.getFullYear() &&
            h.date.getMonth() === date.getMonth() &&
            h.date.getDate() === date.getDate()
        );
        
        if (variableHoliday) {
            return { name: variableHoliday.name, type: 'variable' };
        }
        
        return null;
    }
    
    // Get all holidays for a specific year
    static getHolidaysForYear(year) {
        const holidays = [];
        
        // Add fixed holidays
        this.fixedHolidays.forEach(holiday => {
            holidays.push({
                date: new Date(year, holiday.month - 1, holiday.day),
                name: holiday.name,
                type: 'fixed'
            });
        });
        
        // Add variable holidays
        holidays.push(...this.getVariableHolidays(year));
        
        // Sort by date
        holidays.sort((a, b) => a.date - b.date);
        
        return holidays;
    }
    
    // Get holidays for a specific month
    static getHolidaysForMonth(year, month) {
        const allHolidays = this.getHolidaysForYear(year);
        return allHolidays.filter(holiday => 
            holiday.date.getMonth() === month
        );
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
        // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        let day = new Date(year, month, 1).getDay();
        // Convert to Monday=0, Tuesday=1, ..., Sunday=6
        return (day + 6) % 7;
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
            'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
            'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
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
            const dayOfWeek = (firstDay - 1 - i + 7) % 7; // 0=Monday, 6=Sunday
            week.push({
                day: daysInPrevMonth - i,
                month: prevMonth.month,
                year: prevMonth.year,
                isCurrentMonth: false,
                isPrevMonth: true,
                isNextMonth: false,
                dayOfWeek: dayOfWeek
            });
        }
        
        // Add current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const dayOfWeek = (firstDay + day - 1) % 7; // 0=Monday, 6=Sunday
            week.push({
                day: day,
                month: month,
                year: year,
                isCurrentMonth: true,
                isPrevMonth: false,
                isNextMonth: false,
                isToday: this.isToday(year, month, day),
                dayOfWeek: dayOfWeek
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
            const dayOfWeek = week.length; // Since we're completing the week, position = dayOfWeek
            week.push({
                day: nextDay,
                month: nextMonth.month,
                year: nextMonth.year,
                isCurrentMonth: false,
                isPrevMonth: false,
                isNextMonth: true,
                dayOfWeek: dayOfWeek
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
    storageManager: new StorageManager('calendar_events'),
    eventManager: null, // Will be initialized in init()
    
    // Initialize the application
    init() {
        console.log('Calendar application initializing...');
        
        // Setup performance monitoring
        this.setupPerformanceMonitoring();
        
        // Setup global error handling
        this.setupGlobalErrorHandling();
        
        // Initialize event manager with storage
        this.eventManager = new EventManager(this.storageManager);
        
        // Check storage status
        const storageStatus = this.eventManager.getStorageStatus();
        if (storageStatus.supported) {
            console.log('localStorage is available and working');
        } else {
            console.warn('localStorage is not available - events will not persist');
        }
        
        // Initialize performance optimizations
        this.initializeOptimizations();
        
        this.setupEventListeners();
        
        // Cache DOM elements for performance before rendering
        this.cacheCommonElements();
        
        this.renderCalendar();
        
        // Final polish: Add performance timing
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('calendar-init-end');
            performance.measure('calendar-init', 'calendar-init-start', 'calendar-init-end');
            const measure = performance.getEntriesByName('calendar-init')[0];
            console.log(`Calendar initialized in ${measure.duration.toFixed(2)}ms`);
        }
        
        console.log('Calendar application ready!');
    },
    
    // Performance monitoring
    setupPerformanceMonitoring() {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('calendar-init-start');
            
            // Monitor render performance
            this.originalRenderCalendar = this.renderCalendar;
            this.renderCalendar = this.measureRenderPerformance.bind(this);
        }
    },
    
    measureRenderPerformance() {
        if (typeof performance !== 'undefined' && performance.mark) {
            performance.mark('calendar-render-start');
            const result = this.originalRenderCalendar.call(this);
            performance.mark('calendar-render-end');
            
            try {
                performance.measure('calendar-render-time', 'calendar-render-start', 'calendar-render-end');
                const measures = performance.getEntriesByName('calendar-render-time');
                if (measures.length > 0) {
                    const renderTime = measures[measures.length - 1].duration;
                    if (renderTime > 50) { // Log slow renders
                        console.warn(`Slow calendar render: ${renderTime.toFixed(2)}ms`);
                    }
                }
            } catch (e) {
                // Performance measurement failed, continue normally
            }
            
            return result;
        } else {
            return this.originalRenderCalendar.call(this);
        }
    },
    
    // Initialize performance optimizations
    initializeOptimizations() {
        // Debounce resize events
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });
        
        // Preload commonly used elements
        this.preloadElements();
        
        // Initialize virtual scrolling if needed
        this.initializeVirtualization();
        
        // Setup lazy loading for event previews
        this.setupLazyLoading();
        
        // Initialize loading states
        this.setupLoadingStates();
        
        // Setup smooth transitions
        this.setupSmoothTransitions();
    },
    
    // Cache frequently accessed DOM elements
    cacheCommonElements() {
        try {
            this.cachedElements = {
                calendarDates: document.getElementById('calendar-dates'),
                modalOverlay: document.getElementById('modal-overlay'),
                currentMonthYear: document.getElementById('current-month-year'),
                calendarContainer: document.querySelector('.calendar-container')
            };
            
            // Log missing elements for debugging
            Object.keys(this.cachedElements).forEach(key => {
                if (!this.cachedElements[key]) {
                    console.warn(`Element not found: ${key}`);
                }
            });
        } catch (error) {
            console.error('Error caching elements:', error);
            this.cachedElements = {}; // Initialize as empty object to prevent further errors
        }
    },
    
    // Preload elements to avoid repeated DOM queries
    preloadElements() {
        // Preload modal template
        this.modalTemplate = this.createModalTemplate();
        
        // Preload common class names
        this.classNames = {
            calendarDate: 'calendar-date',
            hasEvents: 'has-events',
            today: 'today',
            selected: 'selected',
            otherMonth: 'other-month'
        };
    },
    
    createModalTemplate() {
        const template = document.createElement('template');
        template.innerHTML = `
            <div class="modal-header">
                <h3 class="modal-title"></h3>
                <button type="button" class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            <div class="modal-content"></div>
        `;
        return template;
    },
    
    // Handle window resize efficiently
    handleResize() {
        // Update calendar layout if needed
        const container = this.cachedElements?.calendarContainer || document.querySelector('.calendar-container');
        if (container) {
            const width = container.offsetWidth;
            if (width < 600 && !container.classList.contains('compact-mode')) {
                container.classList.add('compact-mode');
            } else if (width >= 600 && container.classList.contains('compact-mode')) {
                container.classList.remove('compact-mode');
            }
        }
    },
    
    // Virtual scrolling for large datasets (future enhancement)
    initializeVirtualization() {
        // This would be implemented for calendars with many events
        this.virtualScrolling = {
            enabled: false,
            itemHeight: 60,
            containerHeight: 400,
            visibleItems: 0
        };
    },
    
    // Lazy loading for event previews
    setupLazyLoading() {
        this.lazyLoadObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadEventPreview(entry.target);
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
    },
    
    loadEventPreview(element) {
        if (element.dataset.loaded === 'true') return;
        
        // Load preview content lazily
        const eventId = element.dataset.eventId;
        if (eventId) {
            const event = this.eventManager.getById(eventId);
            if (event) {
                const preview = element.querySelector('.event-preview');
                if (preview) {
                    preview.innerHTML = this.createEventPreviewHTML([event]);
                    element.dataset.loaded = 'true';
                }
            }
        }
    },
    
    // Setup loading states for better UX
    setupLoadingStates() {
        this.showLoading = (element = null) => {
            const target = element || document.querySelector('.calendar-container');
            if (target && !target.classList.contains('calendar-loading')) {
                target.classList.add('calendar-loading');
            }
        };
        
        this.hideLoading = (element = null) => {
            const target = element || document.querySelector('.calendar-container');
            if (target) {
                target.classList.remove('calendar-loading');
            }
        };
    },
    
    // Setup smooth transitions and micro-interactions
    setupSmoothTransitions() {
        // Add intersection observer for smooth animations
        if ('IntersectionObserver' in window) {
            const observerOptions = {
                root: null,
                rootMargin: '0px',
                threshold: 0.1
            };
            
            this.animationObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animate-in');
                    }
                });
            }, observerOptions);
        }
        
        // Enhanced date selection with feedback
        this.originalSelectDate = this.selectDate;
        this.selectDate = (dateElement, date) => {
            // Add visual feedback before selection
            if (dateElement) {
                dateElement.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    dateElement.style.transform = '';
                    this.originalSelectDate.call(this, dateElement, date);
                }, 100);
            } else {
                this.originalSelectDate.call(this, dateElement, date);
            }
        };
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
        
        // Today button
        const todayButton = document.getElementById('today-button');
        if (todayButton) {
            todayButton.addEventListener('click', () => {
                this.navigateToToday();
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
    
    // Navigate to today's date
    navigateToToday() {
        const today = new Date();
        this.currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
        this.renderCalendar();
        
        // Optional: Scroll to and highlight today's date after rendering
        setTimeout(() => {
            const todayElement = document.querySelector('.calendar-date.today');
            if (todayElement) {
                todayElement.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                // Brief highlight animation
                todayElement.style.animation = 'selectedPulse 1s ease-out';
                setTimeout(() => {
                    todayElement.style.animation = '';
                }, 1000);
            }
        }, 100);
    },
    
    // Calendar rendering
    renderCalendar() {
        // Show loading state
        if (this.showLoading) {
            this.showLoading();
        }
        
        const currentYear = this.currentDate.getFullYear();
        const currentMonth = this.currentDate.getMonth();
        
        // Update month/year display
        this.updateMonthYearDisplay(currentYear, currentMonth);
        
        // Generate calendar data
        const calendarData = DateUtils.generateCalendarData(currentYear, currentMonth);
        
        // Render calendar dates
        this.renderCalendarDates(calendarData);
        
        // Hide loading state after rendering
        requestAnimationFrame(() => {
            if (this.hideLoading) {
                this.hideLoading();
            }
        });
    },
    
    updateMonthYearDisplay(year, month) {
        const monthYearElement = document.getElementById('current-month-year');
        if (monthYearElement) {
            const monthName = DateUtils.getMonthName(month);
            monthYearElement.textContent = `${monthName} ${year}`;
        }
    },
    
    renderCalendarDates(calendarData) {
        const calendarDatesContainer = this.cachedElements?.calendarDates || document.getElementById('calendar-dates');
        if (!calendarDatesContainer) return;
        
        // Use document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        
        // Clear existing dates efficiently
        while (calendarDatesContainer.firstChild) {
            calendarDatesContainer.removeChild(calendarDatesContainer.firstChild);
        }
        
        // Render each week with performance optimization
        calendarData.forEach(week => {
            week.forEach(dateObj => {
                const dateElement = this.createOptimizedDateElement(dateObj);
                fragment.appendChild(dateElement);
            });
        });
        
        // Single DOM update
        calendarDatesContainer.appendChild(fragment);
    },
    
    createOptimizedDateElement(dateObj) {
        // Use cached element creation for performance
        const dateElement = document.createElement('div');
        dateElement.className = this.classNames.calendarDate;
        
        // Create separate element for the date number
        const dateNumber = document.createElement('span');
        dateNumber.className = 'calendar-date-number';
        dateNumber.textContent = dateObj.day;
        dateElement.appendChild(dateNumber);
        
        // Apply classes efficiently
        if (!dateObj.isCurrentMonth) {
            dateElement.classList.add(this.classNames.otherMonth);
        }
        
        if (dateObj.isToday) {
            dateElement.classList.add(this.classNames.today);
        }
        
        // Add weekday-specific classes
        if (dateObj.dayOfWeek !== undefined) {
            if (dateObj.dayOfWeek === 5) { // Saturday (5 in Monday=0 system)
                dateElement.classList.add('saturday');
            } else if (dateObj.dayOfWeek === 6) { // Sunday (6 in Monday=0 system)
                dateElement.classList.add('sunday');
            }
        }
        
        // Check for holidays
        const date = new Date(dateObj.year, dateObj.month, dateObj.day);
        const holiday = AustrianHolidays.isHoliday(date);
        
        if (holiday) {
            dateElement.classList.add('holiday');
            dateElement.classList.add(`holiday-${holiday.type}`); // holiday-fixed or holiday-variable
            dateElement.setAttribute('data-holiday', holiday.name);
            dateElement.setAttribute('title', holiday.name);
            
            // Add holiday name display
            this.addHolidayDisplay(dateElement, holiday);
        }
        
        // Check for events and add display (optimized)
        const dateKey = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        const events = this.eventManager.getByDate(dateKey);
        
        if (events.length > 0) {
            dateElement.classList.add(this.classNames.hasEvents);
            this.addOptimizedEventDisplay(dateElement, events);
        }
        
        // Store data efficiently
        Object.assign(dateElement.dataset, {
            year: dateObj.year,
            month: dateObj.month,
            day: dateObj.day,
            isCurrentMonth: dateObj.isCurrentMonth
        });
        
        // Add ARIA attributes
        const formattedDate = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        let ariaLabel = `${dateObj.day} ${DateUtils.getMonthName(dateObj.month)} ${dateObj.year}`;
        
        // Add holiday information to ARIA label
        if (holiday) {
            ariaLabel += `, Feiertag: ${holiday.name}`;
        }
        
        dateElement.setAttribute('role', 'gridcell');
        dateElement.setAttribute('aria-label', ariaLabel);
        dateElement.setAttribute('tabindex', dateObj.isCurrentMonth ? '0' : '-1');
        
        // Add event listeners with delegation optimization
        dateElement.addEventListener('click', this.handleDateClickOptimized.bind(this));
        dateElement.addEventListener('keydown', this.handleDateKeydownOptimized.bind(this));
        
        return dateElement;
    },
    
    addHolidayDisplay(dateElement, holiday) {
        // Create holiday indicator
        const holidayIndicator = document.createElement('div');
        holidayIndicator.className = 'holiday-indicator';
        
        // Add holiday name (shortened for space)
        const holidayName = document.createElement('div');
        holidayName.className = 'holiday-name';
        holidayName.textContent = this.shortenHolidayName(holiday.name);
        holidayName.setAttribute('title', holiday.name); // Full name on hover
        
        holidayIndicator.appendChild(holidayName);
        
        // Add visual marker
        const marker = document.createElement('div');
        marker.className = `holiday-marker holiday-marker-${holiday.type}`;
        holidayIndicator.appendChild(marker);
        
        dateElement.appendChild(holidayIndicator);
    },
    
    shortenHolidayName(name) {
        // Shorten holiday names for better display
        const shortNames = {
            'Neujahr': 'Neujahr',
            'Heilige Drei Könige': 'Hl. 3 Könige',
            'Staatsfeiertag': 'Staatsfeiertag',
            'Mariä Himmelfahrt': 'M. Himmelfahrt',
            'Nationalfeiertag': 'Nationalfeiertag',
            'Allerheiligen': 'Allerheiligen',
            'Mariä Empfängnis': 'M. Empfängnis',
            'Christtag': 'Christtag',
            'Stefanitag': 'Stefanitag',
            'Karfreitag': 'Karfreitag',
            'Ostersonntag': 'Ostersonntag',
            'Ostermontag': 'Ostermontag',
            'Christi Himmelfahrt': 'Chr. Himmelfahrt',
            'Pfingstsonntag': 'Pfingstsonntag',
            'Pfingstmontag': 'Pfingstmontag',
            'Fronleichnam': 'Fronleichnam'
        };
        
        return shortNames[name] || name;
    },
    
    addOptimizedEventDisplay(dateElement, events) {
        // Optimized event display creation
        const indicatorsFragment = document.createDocumentFragment();
        
        // Add event count for many events
        if (events.length > 3) {
            const eventCount = document.createElement('div');
            eventCount.className = 'event-count';
            eventCount.textContent = events.length;
            indicatorsFragment.appendChild(eventCount);
        }
        
        // Add event indicators
        const indicators = document.createElement('div');
        indicators.className = 'event-indicators';
        
        const categories = [...new Set(events.slice(0, 4).map(event => event.category))];
        categories.forEach(category => {
            const dot = document.createElement('div');
            dot.className = `event-dot ${category}`;
            indicators.appendChild(dot);
        });
        
        indicatorsFragment.appendChild(indicators);
        
        // Add mini event list
        const miniList = document.createElement('div');
        miniList.className = 'event-mini-list';
        
        events.slice(0, 3).forEach(event => {
            const miniItem = document.createElement('div');
            miniItem.className = `event-mini-item ${event.category}`;
            miniItem.textContent = event.title;
            miniItem.title = this.formatEventTooltip(event);
            miniItem.dataset.eventId = event.id;
            
            // Use event delegation for performance
            miniItem.addEventListener('click', this.handleEventItemClickOptimized.bind(this));
            
            miniList.appendChild(miniItem);
        });
        
        indicatorsFragment.appendChild(miniList);
        
        // Add hover tooltip (lazy loaded)
        const preview = document.createElement('div');
        preview.className = 'event-preview';
        preview.dataset.eventIds = events.map(e => e.id).join(',');
        indicatorsFragment.appendChild(preview);
        
        // Observe for lazy loading
        if (this.lazyLoadObserver) {
            this.lazyLoadObserver.observe(preview);
        }
        
        dateElement.appendChild(indicatorsFragment);
    },
    
    handleDateClickOptimized(event) {
        const target = event.currentTarget;
        const dateObj = {
            year: parseInt(target.dataset.year),
            month: parseInt(target.dataset.month),
            day: parseInt(target.dataset.day),
            isCurrentMonth: target.dataset.isCurrentMonth === 'true'
        };
        
        this.handleDateClick(event, dateObj);
    },
    
    handleDateKeydownOptimized(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleDateClickOptimized(event);
        }
    },
    
    handleEventItemClickOptimized(event) {
        event.stopPropagation();
        const eventId = event.target.dataset.eventId;
        if (eventId) {
            this.showEventDetailsModal(eventId);
        }
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
        
        // Check for events on this date and add event display
        const dateKey = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        const events = this.eventManager.getByDate(dateKey);
        
        if (events.length > 0) {
            dateElement.classList.add('has-events');
            this.addEventDisplayToDate(dateElement, events);
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
        
        // Show event creation modal
        this.showEventCreationModal(dateObj);
    },
    
    highlightSelectedDate(dateElement) {
        // Remove previous selection
        const previousSelected = document.querySelector('.calendar-date.selected');
        if (previousSelected) {
            previousSelected.classList.remove('selected');
        }
        
        // Highlight new selection
        dateElement.classList.add('selected');
    },
    
    // Storage utility methods
    getStorageInfo() {
        return this.eventManager ? this.eventManager.getStorageStatus() : null;
    },
    
    exportEvents() {
        if (this.eventManager) {
            return this.eventManager.downloadBackup();
        }
        console.warn('Event manager not available for export');
        return false;
    },
    
    async importEvents(file) {
        if (!this.eventManager) {
            throw new Error('Event manager not available for import');
        }
        
        try {
            const success = await this.eventManager.restoreFromFile(file);
            if (success) {
                // Re-render calendar to show imported events
                this.renderCalendar();
                console.log('Events imported successfully');
            }
            return success;
        } catch (error) {
            console.error('Failed to import events:', error);
            throw error;
        }
    },
    
    clearAllData() {
        if (!this.eventManager) {
            console.warn('Event manager not available');
            return false;
        }
        
        const confirmed = confirm('Are you sure you want to clear all event data? This action cannot be undone.');
        if (confirmed) {
            this.eventManager.clear();
            this.renderCalendar();
            console.log('All event data cleared');
            return true;
        }
        return false;
    },
    
    // Add some test events for demonstration
    addTestEvents() {
        if (!this.eventManager) return;
        
        const today = new Date();
        const testEvents = [
            {
                title: 'Team Meeting',
                description: 'Weekly team sync meeting',
                date: DateUtils.formatDate(today.getFullYear(), today.getMonth(), today.getDate()),
                startTime: '10:00',
                endTime: '11:00',
                category: 'work'
            },
            {
                title: 'Lunch Break',
                description: 'Lunch with colleagues',
                date: DateUtils.formatDate(today.getFullYear(), today.getMonth(), today.getDate()),
                startTime: '12:00',
                endTime: '13:00',
                category: 'personal'
            },
            {
                title: 'Project Deadline',
                description: 'Final submission for Q1 project',
                date: DateUtils.formatDate(today.getFullYear(), today.getMonth(), today.getDate() + 2),
                startTime: '17:00',
                endTime: '18:00',
                category: 'work'
            }
        ];
        
        testEvents.forEach(eventData => {
            try {
                this.eventManager.create(eventData);
                console.log(`Created test event: ${eventData.title}`);
            } catch (error) {
                console.error('Failed to create test event:', error);
            }
        });
        
        this.renderCalendar();
        console.log('Test events added successfully');
    },
    
    // Event creation modal
    showEventCreationModal(dateObj) {
        const formattedDate = DateUtils.formatDate(dateObj.year, dateObj.month, dateObj.day);
        const dateDisplay = `${DateUtils.getMonthName(dateObj.month)} ${dateObj.day}, ${dateObj.year}`;
        
        const modalContent = this.createEventFormHTML(formattedDate, dateDisplay);
        this.showModal(modalContent);
        
        // Setup form event listeners
        this.setupEventFormListeners();
    },
    
    createEventFormHTML(dateValue, dateDisplay) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">Create New Event</h3>
                <button type="button" class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            
            <form class="event-form" id="event-form" novalidate>
                <div class="form-group">
                    <label for="event-date" class="form-label">Date</label>
                    <input type="date" id="event-date" name="date" class="form-input" 
                           value="${dateValue}" required>
                    <div class="form-error" id="date-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="event-title" class="form-label">Event Title *</label>
                    <input type="text" id="event-title" name="title" class="form-input" 
                           placeholder="Enter event title" required maxlength="100">
                    <div class="form-error" id="title-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="event-description" class="form-label">Description</label>
                    <textarea id="event-description" name="description" class="form-textarea" 
                              placeholder="Enter event description (optional)" maxlength="500"></textarea>
                    <div class="form-error" id="description-error"></div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="event-start-time" class="form-label">Start Time</label>
                        <input type="time" id="event-start-time" name="startTime" class="form-input">
                        <div class="form-error" id="start-time-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="event-end-time" class="form-label">End Time</label>
                        <input type="time" id="event-end-time" name="endTime" class="form-input">
                        <div class="form-error" id="end-time-error"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <div class="category-badges">
                        <button type="button" class="category-badge work" data-category="work">Work</button>
                        <button type="button" class="category-badge personal selected" data-category="personal">Personal</button>
                        <button type="button" class="category-badge health" data-category="health">Health</button>
                        <button type="button" class="category-badge education" data-category="education">Education</button>
                        <button type="button" class="category-badge social" data-category="social">Social</button>
                        <button type="button" class="category-badge travel" data-category="travel">Travel</button>
                        <button type="button" class="category-badge general" data-category="general">General</button>
                    </div>
                    <input type="hidden" id="event-category" name="category" value="personal">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" id="cancel-event">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="create-event">Create Event</button>
                </div>
            </form>
        `;
    },
    
    setupEventFormListeners() {
        const form = document.getElementById('event-form');
        const closeBtn = document.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-event');
        const categoryBadges = document.querySelectorAll('.category-badge');
        const categoryInput = document.getElementById('event-category');
        
        // Close modal handlers
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Category selection
        categoryBadges.forEach(badge => {
            badge.addEventListener('click', () => {
                // Remove selected class from all badges
                categoryBadges.forEach(b => b.classList.remove('selected'));
                
                // Add selected class to clicked badge
                badge.classList.add('selected');
                
                // Update hidden input
                categoryInput.value = badge.dataset.category;
            });
        });
        
        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEventFormSubmission(form);
            });
        }
        
        // Real-time validation
        const titleInput = document.getElementById('event-title');
        const startTimeInput = document.getElementById('event-start-time');
        const endTimeInput = document.getElementById('event-end-time');
        
        if (titleInput) {
            titleInput.addEventListener('blur', () => this.validateField('title', titleInput.value));
            titleInput.addEventListener('input', () => this.clearFieldError('title'));
        }
        
        if (startTimeInput && endTimeInput) {
            const validateTimes = () => {
                if (startTimeInput.value && endTimeInput.value) {
                    this.validateTimeRange(startTimeInput.value, endTimeInput.value);
                }
            };
            
            startTimeInput.addEventListener('change', validateTimes);
            endTimeInput.addEventListener('change', validateTimes);
        }
        
        // Focus on first input
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    },
    
    handleEventFormSubmission(form) {
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            date: formData.get('date'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            category: formData.get('category')
        };
        
        // Validate form data
        if (!this.validateEventForm(eventData)) {
            return; // Validation failed, errors are displayed
        }
        
        try {
            // Create the event
            const newEvent = this.eventManager.create(eventData);
            
            // Close modal
            this.closeModal();
            
            // Re-render calendar to show new event
            this.renderCalendar();
            
            // Show success message
            console.log('Event created successfully:', newEvent);
            
            // Optional: Show success notification
            this.showNotification('Event created successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to create event:', error);
            this.showNotification(error.message, 'error');
        }
    },
    
    validateEventForm(eventData) {
        // Clear previous errors
        this.clearAllFieldErrors();
        
        // Define validation schema
        const schema = {
            title: ['required', 'minLength:1', 'maxLength:100'],
            description: ['maxLength:500'],
            date: ['required', 'date'],
            startTime: eventData.startTime ? ['time'] : [],
            endTime: eventData.endTime ? ['time'] : [],
            category: ['required']
        };
        
        // Sanitize input data
        const sanitizedData = {
            ...eventData,
            title: InputSanitizer.sanitizeText(eventData.title),
            description: InputSanitizer.sanitizeText(eventData.description)
        };
        
        // Validate form
        const validation = FormValidator.validateForm(sanitizedData, schema);
        
        // Display errors
        for (const [fieldName, result] of Object.entries(validation.fields)) {
            if (!result.isValid) {
                this.showFieldError(fieldName === 'startTime' ? 'start-time' : 
                                  fieldName === 'endTime' ? 'end-time' : fieldName, 
                                  result.errors[0]);
            }
        }
        
        // Additional custom validations
        if (sanitizedData.startTime && sanitizedData.endTime) {
            if (sanitizedData.startTime >= sanitizedData.endTime) {
                this.showFieldError('end-time', 'End time must be after start time');
                validation.isValid = false;
            }
        }
        
        // Validate date is not in past (optional - can be disabled)
        if (sanitizedData.date && this.shouldValidateFutureDate()) {
            const eventDate = new Date(sanitizedData.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (eventDate < today) {
                this.showFieldError('date', 'Event date cannot be in the past');
                validation.isValid = false;
            }
        }
        
        return validation.isValid;
    },
    
    shouldValidateFutureDate() {
        // This can be configured - for now, allow past dates
        return false;
    },
    
    validateField(fieldName, value) {
        switch (fieldName) {
            case 'title':
                if (!value || value.trim().length === 0) {
                    this.showFieldError('title', 'Event title is required');
                    return false;
                } else if (value.length > 100) {
                    this.showFieldError('title', 'Title must be 100 characters or less');
                    return false;
                }
                break;
        }
        return true;
    },
    
    validateTimeRange(startTime, endTime) {
        if (startTime && endTime && startTime >= endTime) {
            this.showFieldError('end-time', 'End time must be after start time');
            return false;
        }
        this.clearFieldError('end-time');
        return true;
    },
    
    showFieldError(fieldName, message) {
        const field = document.getElementById(`event-${fieldName}`);
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (field) {
            field.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    },
    
    clearFieldError(fieldName) {
        const field = document.getElementById(`event-${fieldName}`);
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (field) {
            field.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.classList.remove('visible');
            errorElement.textContent = '';
        }
    },
    
    clearAllFieldErrors() {
        const errorElements = document.querySelectorAll('.form-error.visible');
        const errorFields = document.querySelectorAll('.form-input.error, .form-textarea.error, .form-select.error');
        
        errorElements.forEach(el => {
            el.classList.remove('visible');
            el.textContent = '';
        });
        
        errorFields.forEach(field => {
            field.classList.remove('error');
        });
    },
    
    showNotification(message, type = 'info') {
        // Simple notification implementation
        // In a more complex app, you might use a toast library
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '6px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            default:
                notification.style.background = '#17a2b8';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },
    
    // Event display functions
    addEventDisplayToDate(dateElement, events) {
        // Add event count if more than 3 events
        if (events.length > 3) {
            const eventCount = document.createElement('div');
            eventCount.className = 'event-count';
            eventCount.textContent = events.length;
            dateElement.appendChild(eventCount);
        }
        
        // Add event indicators (dots)
        const indicators = document.createElement('div');
        indicators.className = 'event-indicators';
        
        // Show up to 4 dots for different categories
        const categories = [...new Set(events.slice(0, 4).map(event => event.category))];
        categories.forEach(category => {
            const dot = document.createElement('div');
            dot.className = `event-dot ${category}`;
            indicators.appendChild(dot);
        });
        
        dateElement.appendChild(indicators);
        
        // Add mini event list for list view
        const miniList = document.createElement('div');
        miniList.className = 'event-mini-list';
        
        // Show up to 3 events in the mini list
        events.slice(0, 3).forEach(event => {
            const miniItem = document.createElement('div');
            miniItem.className = `event-mini-item ${event.category}`;
            miniItem.textContent = event.title;
            miniItem.title = this.formatEventTooltip(event);
            miniItem.dataset.eventId = event.id;
            
            // Add click handler for event editing
            miniItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetailsModal(event.id);
            });
            
            miniList.appendChild(miniItem);
        });
        
        dateElement.appendChild(miniList);
        
        // Add hover tooltip
        const preview = document.createElement('div');
        preview.className = 'event-preview';
        preview.innerHTML = this.createEventPreviewHTML(events);
        dateElement.appendChild(preview);
    },
    
    formatEventTooltip(event) {
        let tooltip = event.title;
        if (event.startTime) {
            tooltip += ` (${event.getDisplayTime()})`;
        }
        if (event.description) {
            tooltip += ` - ${event.description}`;
        }
        return tooltip;
    },
    
    createEventPreviewHTML(events) {
        if (events.length === 0) return '';
        
        if (events.length === 1) {
            const event = events[0];
            return `
                <div class="preview-single">
                    <strong>${event.title}</strong>
                    ${event.startTime ? `<br><small>${event.getDisplayTime()}</small>` : ''}
                    ${event.description ? `<br><small>${event.description}</small>` : ''}
                </div>
            `;
        }
        
        return `
            <div class="preview-multiple">
                <strong>${events.length} Events</strong>
                ${events.slice(0, 3).map(event => `
                    <br>• ${event.title}${event.startTime ? ` (${event.startTime})` : ''}
                `).join('')}
                ${events.length > 3 ? `<br>... and ${events.length - 3} more` : ''}
            </div>
        `;
    },
    
    // Toggle between different view modes
    toggleCalendarView() {
        const calendarDates = document.getElementById('calendar-dates');
        if (!calendarDates) return;
        
        const currentMode = calendarDates.classList.contains('view-list') ? 'list' : 'dots';
        
        if (currentMode === 'dots') {
            calendarDates.classList.add('view-list');
            calendarDates.classList.remove('view-dots');
        } else {
            calendarDates.classList.add('view-dots');
            calendarDates.classList.remove('view-list');
        }
        
        return currentMode === 'dots' ? 'list' : 'dots';
    },
    
    // Get events for date range (for month view)
    getEventsForCurrentMonth() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        
        const startDateString = DateUtils.formatDate(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateString = DateUtils.formatDate(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        return this.eventManager.getByDateRange(startDateString, endDateString);
    },
    
    // Show event details modal with edit/delete options
    showEventDetailsModal(eventId) {
        const event = this.eventManager.getById(eventId);
        if (!event) {
            this.showNotification('Event not found', 'error');
            return;
        }
        
        const modalContent = this.createEventDetailsHTML(event);
        this.showModal(modalContent);
        this.setupEventDetailsListeners(event);
    },
    
    createEventDetailsHTML(event) {
        const dateDisplay = new Date(event.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        return `
            <div class="modal-header">
                <h3 class="modal-title">Event Details</h3>
                <button type="button" class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            
            <div class="event-details">
                <div class="event-detail-section">
                    <h4>${event.title}</h4>
                    <div class="event-meta">
                        <span class="event-date">📅 ${dateDisplay}</span>
                        ${event.startTime ? `<span class="event-time">🕐 ${event.getDisplayTime()}</span>` : ''}
                        <span class="event-category">
                            <span class="category-dot ${event.category}"></span>
                            ${event.category.charAt(0).toUpperCase() + event.category.slice(1)}
                        </span>
                    </div>
                    ${event.description ? `
                        <div class="event-description">
                            <p>${event.description}</p>
                        </div>
                    ` : ''}
                </div>
                
                <div class="event-timestamps">
                    <small class="text-muted">
                        Created: ${new Date(event.createdAt).toLocaleDateString()}
                        ${event.updatedAt !== event.createdAt ? 
                            `<br>Updated: ${new Date(event.updatedAt).toLocaleDateString()}` : ''}
                    </small>
                </div>
            </div>
            
            <div class="form-actions">
                <button type="button" class="btn btn-outline" id="close-details">Close</button>
                <button type="button" class="btn btn-secondary" id="edit-event">Edit Event</button>
                <button type="button" class="btn btn-danger" id="delete-event">Delete</button>
            </div>
        `;
    },
    
    setupEventDetailsListeners(event) {
        const closeBtn = document.querySelector('.modal-close');
        const closeDetailsBtn = document.getElementById('close-details');
        const editBtn = document.getElementById('edit-event');
        const deleteBtn = document.getElementById('delete-event');
        
        // Close modal handlers
        [closeBtn, closeDetailsBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeModal());
            }
        });
        
        // Edit event handler
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.showEventEditModal(event);
            });
        }
        
        // Delete event handler
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.confirmDeleteEvent(event);
            });
        }
    },
    
    showEventEditModal(event) {
        const dateDisplay = `${DateUtils.getMonthName(new Date(event.date).getMonth())} ${new Date(event.date).getDate()}, ${new Date(event.date).getFullYear()}`;
        const modalContent = this.createEventEditFormHTML(event);
        this.showModal(modalContent);
        this.setupEventEditFormListeners(event);
    },
    
    createEventEditFormHTML(event) {
        return `
            <div class="modal-header">
                <h3 class="modal-title">Edit Event</h3>
                <button type="button" class="modal-close" aria-label="Close modal">&times;</button>
            </div>
            
            <form class="event-form" id="edit-event-form" novalidate>
                <div class="form-group">
                    <label for="edit-event-date" class="form-label">Date</label>
                    <input type="date" id="edit-event-date" name="date" class="form-input" 
                           value="${event.date}" required>
                    <div class="form-error" id="edit-date-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="edit-event-title" class="form-label">Event Title *</label>
                    <input type="text" id="edit-event-title" name="title" class="form-input" 
                           value="${event.title}" required maxlength="100">
                    <div class="form-error" id="edit-title-error"></div>
                </div>
                
                <div class="form-group">
                    <label for="edit-event-description" class="form-label">Description</label>
                    <textarea id="edit-event-description" name="description" class="form-textarea" 
                              maxlength="500">${event.description}</textarea>
                    <div class="form-error" id="edit-description-error"></div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="edit-event-start-time" class="form-label">Start Time</label>
                        <input type="time" id="edit-event-start-time" name="startTime" 
                               class="form-input" value="${event.startTime}">
                        <div class="form-error" id="edit-start-time-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-event-end-time" class="form-label">End Time</label>
                        <input type="time" id="edit-event-end-time" name="endTime" 
                               class="form-input" value="${event.endTime}">
                        <div class="form-error" id="edit-end-time-error"></div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Category</label>
                    <div class="category-badges">
                        <button type="button" class="category-badge work ${event.category === 'work' ? 'selected' : ''}" data-category="work">Work</button>
                        <button type="button" class="category-badge personal ${event.category === 'personal' ? 'selected' : ''}" data-category="personal">Personal</button>
                        <button type="button" class="category-badge health ${event.category === 'health' ? 'selected' : ''}" data-category="health">Health</button>
                        <button type="button" class="category-badge education ${event.category === 'education' ? 'selected' : ''}" data-category="education">Education</button>
                        <button type="button" class="category-badge social ${event.category === 'social' ? 'selected' : ''}" data-category="social">Social</button>
                        <button type="button" class="category-badge travel ${event.category === 'travel' ? 'selected' : ''}" data-category="travel">Travel</button>
                        <button type="button" class="category-badge general ${event.category === 'general' ? 'selected' : ''}" data-category="general">General</button>
                    </div>
                    <input type="hidden" id="edit-event-category" name="category" value="${event.category}">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" id="cancel-edit">Cancel</button>
                    <button type="submit" class="btn btn-primary" id="save-event">Save Changes</button>
                </div>
            </form>
        `;
    },
    
    setupEventEditFormListeners(event) {
        const form = document.getElementById('edit-event-form');
        const closeBtn = document.querySelector('.modal-close');
        const cancelBtn = document.getElementById('cancel-edit');
        const categoryBadges = document.querySelectorAll('.category-badge');
        const categoryInput = document.getElementById('edit-event-category');
        
        // Close modal handlers
        [closeBtn, cancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.closeModal());
            }
        });
        
        // Category selection
        categoryBadges.forEach(badge => {
            badge.addEventListener('click', () => {
                categoryBadges.forEach(b => b.classList.remove('selected'));
                badge.classList.add('selected');
                categoryInput.value = badge.dataset.category;
            });
        });
        
        // Form submission
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEventEditSubmission(form, event);
            });
        }
        
        // Real-time validation
        const titleInput = document.getElementById('edit-event-title');
        const startTimeInput = document.getElementById('edit-event-start-time');
        const endTimeInput = document.getElementById('edit-event-end-time');
        
        if (titleInput) {
            titleInput.addEventListener('blur', () => this.validateEditField('title', titleInput.value));
            titleInput.addEventListener('input', () => this.clearEditFieldError('title'));
        }
        
        if (startTimeInput && endTimeInput) {
            const validateTimes = () => {
                if (startTimeInput.value && endTimeInput.value) {
                    this.validateEditTimeRange(startTimeInput.value, endTimeInput.value);
                }
            };
            
            startTimeInput.addEventListener('change', validateTimes);
            endTimeInput.addEventListener('change', validateTimes);
        }
        
        // Focus on title input
        if (titleInput) {
            setTimeout(() => titleInput.focus(), 100);
        }
    },
    
    handleEventEditSubmission(form, originalEvent) {
        const formData = new FormData(form);
        const eventData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            date: formData.get('date'),
            startTime: formData.get('startTime'),
            endTime: formData.get('endTime'),
            category: formData.get('category')
        };
        
        // Validate form data
        if (!this.validateEventEditForm(eventData)) {
            return; // Validation failed
        }
        
        try {
            // Update the event
            this.eventManager.update(originalEvent.id, eventData);
            
            // Close modal
            this.closeModal();
            
            // Re-render calendar to show updated event
            this.renderCalendar();
            
            // Show success message
            this.showNotification('Event updated successfully!', 'success');
            
        } catch (error) {
            console.error('Failed to update event:', error);
            this.showNotification(error.message, 'error');
        }
    },
    
    confirmDeleteEvent(event) {
        const confirmed = confirm(`Are you sure you want to delete "${event.title}"? This action cannot be undone.`);
        
        if (confirmed) {
            try {
                this.eventManager.delete(event.id);
                this.closeModal();
                this.renderCalendar();
                this.showNotification('Event deleted successfully!', 'success');
            } catch (error) {
                console.error('Failed to delete event:', error);
                this.showNotification(error.message, 'error');
            }
        }
    },
    
    // Enhanced validation for edit form
    validateEventEditForm(eventData) {
        this.clearAllEditFieldErrors();
        
        // Use the same validation logic as create form
        const schema = {
            title: ['required', 'minLength:1', 'maxLength:100'],
            description: ['maxLength:500'],
            date: ['required', 'date'],
            startTime: eventData.startTime ? ['time'] : [],
            endTime: eventData.endTime ? ['time'] : [],
            category: ['required']
        };
        
        const sanitizedData = {
            ...eventData,
            title: InputSanitizer.sanitizeText(eventData.title),
            description: InputSanitizer.sanitizeText(eventData.description)
        };
        
        const validation = FormValidator.validateForm(sanitizedData, schema);
        
        // Display errors for edit form
        for (const [fieldName, result] of Object.entries(validation.fields)) {
            if (!result.isValid) {
                this.showEditFieldError(fieldName === 'startTime' ? 'start-time' : 
                                      fieldName === 'endTime' ? 'end-time' : fieldName, 
                                      result.errors[0]);
            }
        }
        
        // Additional custom validations
        if (sanitizedData.startTime && sanitizedData.endTime) {
            if (sanitizedData.startTime >= sanitizedData.endTime) {
                this.showEditFieldError('end-time', 'End time must be after start time');
                validation.isValid = false;
            }
        }
        
        return validation.isValid;
    },
    
    validateEditField(fieldName, value) {
        switch (fieldName) {
            case 'title':
                if (!value || value.trim().length === 0) {
                    this.showEditFieldError('title', 'Event title is required');
                    return false;
                } else if (value.length > 100) {
                    this.showEditFieldError('title', 'Title must be 100 characters or less');
                    return false;
                }
                break;
        }
        return true;
    },
    
    validateEditTimeRange(startTime, endTime) {
        if (startTime && endTime && startTime >= endTime) {
            this.showEditFieldError('end-time', 'End time must be after start time');
            return false;
        }
        this.clearEditFieldError('end-time');
        return true;
    },
    
    showEditFieldError(fieldName, message) {
        const field = document.getElementById(`edit-event-${fieldName}`);
        const errorElement = document.getElementById(`edit-${fieldName}-error`);
        
        if (field) {
            field.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('visible');
        }
    },
    
    clearEditFieldError(fieldName) {
        const field = document.getElementById(`edit-event-${fieldName}`);
        const errorElement = document.getElementById(`edit-${fieldName}-error`);
        
        if (field) {
            field.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.classList.remove('visible');
            errorElement.textContent = '';
        }
    },
    
    clearAllEditFieldErrors() {
        const errorElements = document.querySelectorAll('[id^="edit-"][id$="-error"].visible');
        const errorFields = document.querySelectorAll('[id^="edit-event-"].error');
        
        errorElements.forEach(el => {
            el.classList.remove('visible');
            el.textContent = '';
        });
        
        errorFields.forEach(field => {
            field.classList.remove('error');
        });
    },
    
    // Enhanced error handling and user feedback
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        let userMessage = 'An unexpected error occurred. Please try again.';
        
        // Provide specific error messages based on error type
        if (error.name === 'QuotaExceededError') {
            userMessage = 'Storage quota exceeded. Please clear some data or export your events.';
        } else if (error.name === 'NetworkError') {
            userMessage = 'Network error. Please check your connection and try again.';
        } else if (error.name === 'ValidationError') {
            userMessage = error.message;
        } else if (error.message && error.message.includes('validation')) {
            userMessage = error.message;
        }
        
        this.showNotification(userMessage, 'error');
        
        // Log to analytics (in production, this would send to analytics service)
        this.logError(error, context);
    },
    
    logError(error, context) {
        const errorLog = {
            timestamp: new Date().toISOString(),
            context: context,
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack
            },
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        // In production, send to error tracking service
        console.log('Error logged:', errorLog);
        
        // Store recent errors in sessionStorage for debugging
        try {
            const recentErrors = JSON.parse(sessionStorage.getItem('calendar_errors') || '[]');
            recentErrors.push(errorLog);
            
            // Keep only last 10 errors
            if (recentErrors.length > 10) {
                recentErrors.splice(0, recentErrors.length - 10);
            }
            
            sessionStorage.setItem('calendar_errors', JSON.stringify(recentErrors));
        } catch (e) {
            // If sessionStorage is full or unavailable, ignore
        }
    },
    
    // Enhanced notification system with different types and auto-dismiss
    showAdvancedNotification(message, type = 'info', options = {}) {
        const {
            duration = 5000,
            actions = [],
            persistent = false,
            icon = null
        } = options;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} notification-advanced`;
        
        // Create notification content
        const content = document.createElement('div');
        content.className = 'notification-content';
        
        if (icon) {
            const iconElement = document.createElement('span');
            iconElement.className = 'notification-icon';
            iconElement.textContent = icon;
            content.appendChild(iconElement);
        }
        
        const messageElement = document.createElement('span');
        messageElement.className = 'notification-message';
        messageElement.textContent = message;
        content.appendChild(messageElement);
        
        notification.appendChild(content);
        
        // Add action buttons if provided
        if (actions.length > 0) {
            const actionsContainer = document.createElement('div');
            actionsContainer.className = 'notification-actions';
            
            actions.forEach(action => {
                const button = document.createElement('button');
                button.textContent = action.text;
                button.className = 'notification-action-btn';
                button.addEventListener('click', () => {
                    action.callback();
                    if (!action.keepOpen) {
                        this.dismissNotification(notification);
                    }
                });
                actionsContainer.appendChild(button);
            });
            
            notification.appendChild(actionsContainer);
        }
        
        // Add close button if not auto-dismissing
        if (persistent || actions.length > 0) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'notification-close';
            closeBtn.innerHTML = '×';
            closeBtn.addEventListener('click', () => {
                this.dismissNotification(notification);
            });
            notification.appendChild(closeBtn);
        }
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease',
            maxWidth: '400px',
            wordWrap: 'break-word',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
        });
        
        // Set background color based on type
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        
        notification.style.background = colors[type] || colors.info;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto-dismiss if not persistent
        if (!persistent && duration > 0) {
            setTimeout(() => {
                this.dismissNotification(notification);
            }, duration);
        }
        
        return notification;
    },
    
    dismissNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    },
    
    // Global error handler setup
    setupGlobalErrorHandling() {
        const self = this;
        
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            self.handleError(event.reason, 'Unhandled Promise Rejection');
            event.preventDefault(); // Prevent browser default error handling
        });
        
        // Handle JavaScript errors
        window.addEventListener('error', (event) => {
            self.handleError(new Error(event.message), `JavaScript Error at ${event.filename}:${event.lineno}`);
        });
    },
    
    // Recovery mechanisms
    recoverFromError() {
        try {
            // Clear potentially corrupted data
            this.selectedDate = null;
            
            // Reload events from storage
            this.eventManager.loadFromStorage();
            
            // Re-render calendar
            this.renderCalendar();
            
            this.showNotification('Application recovered successfully', 'success');
        } catch (error) {
            this.handleError(error, 'Error Recovery');
        }
    },
    
    // Debug information for support
    getDebugInfo() {
        const storageStatus = this.eventManager.getStorageStatus();
        
        return {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            storage: storageStatus,
            eventCount: this.eventManager ? this.eventManager.getAll().length : 0,
            currentDate: this.currentDate.toISOString(),
            errors: JSON.parse(sessionStorage.getItem('calendar_errors') || '[]')
        };
    }
};

// Initialize the application when the script loads
CalendarApp.init();