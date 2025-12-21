// script.js - Search Engine JavaScript
class SearchEngine {
    constructor() {
        this.currentQuery = '';
        this.searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSearchHistory();
        
        // Check for query in URL
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        if (query) {
            document.getElementById('searchInput').value = query;
            this.performSearch(query);
        }
    }

    bindEvents() {
        // Search form submission
        document.getElementById('searchForm').addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('searchInput').value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        // Search button click
        document.getElementById('searchButton').addEventListener('click', () => {
            const query = document.getElementById('searchInput').value.trim();
            if (query) {
                this.performSearch(query);
            }
        });

        // Enter key in search input
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = document.getElementById('searchInput').value.trim();
                if (query) {
                    this.performSearch(query);
                }
            }
        });

        // Clear search button
        document.getElementById('clearSearch').addEventListener('click', () => {
            document.getElementById('searchInput').value = '';
            document.getElementById('searchInput').focus();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Focus search on /
            if (e.key === '/' && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            
            // Clear search on Escape
            if (e.key === 'Escape' && document.activeElement === document.getElementById('searchInput')) {
                document.getElementById('searchInput').value = '';
            }
        });

        // Quick search buttons
        document.querySelectorAll('.quick-search').forEach(button => {
            button.addEventListener('click', (e) => {
                const query = e.target.textContent;
                document.getElementById('searchInput').value = query;
                this.performSearch(query);
            });
        });
    }

    async performSearch(query) {
        if (!query.trim()) return;

        this.currentQuery = query;
        this.addToHistory(query);
        this.updateURL(query);

        // Show loading state
        this.showLoading();

        try {
            const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&count=15`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.displayResults(data);
            
        } catch (error) {
            console.error('Search error:', error);
            this.displayError(error);
        }
    }

    displayResults(data) {
        this.hideLoading();
        
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';
        
        // Update results count
        const resultsCount = document.getElementById('resultsCount');
        const totalResults = data.results.length + data.relatedTopics.length;
        resultsCount.textContent = `About ${totalResults.toLocaleString()} results`;
        
        // Show knowledge panel if abstract exists
        if (data.abstract.text || data.definition.text) {
            this.createKnowledgePanel(data);
        }
        
        // Display search results
        if (data.results.length > 0) {
            data.results.forEach((result, index) => {
                resultsContainer.appendChild(this.createResultItem(result, index));
            });
        } else {
            resultsContainer.appendChild(this.createNoResultsMessage());
        }
        
        // Display related topics
        if (data.relatedTopics.length > 0) {
            this.createRelatedTopics(data.relatedTopics);
        }
        
        // Add pagination
        this.createPagination();
        
        // Scroll to results
        window.scrollTo({ top: 200, behavior: 'smooth' });
    }

    createKnowledgePanel(data) {
        const resultsContainer = document.getElementById('resultsContainer');
        
        const knowledgePanel = document.createElement('div');
        knowledgePanel.className = 'knowledge-panel';
        
        let content = '<div class="knowledge-header">';
        
        if (data.image) {
            content += `<img src="${data.image}" alt="${data.abstract.heading || 'Image'}" class="knowledge-image">`;
        }
        
        content += `
            <div>
                <h2 class="knowledge-title">${data.abstract.heading || data.query}</h2>
                ${data.abstract.text ? `<p class="knowledge-description">${data.abstract.text}</p>` : ''}
                ${data.definition.text ? `<p class="knowledge-description"><strong>Definition:</strong> ${data.definition.text}</p>` : ''}
        `;
        
        if (data.abstract.source || data.definition.source) {
            content += `<p class="knowledge-source">Source: ${data.abstract.source || data.definition.source}</p>`;
        }
        
        if (data.abstract.url) {
            content += `<a href="${data.abstract.url}" target="_blank" class="footer-link" style="margin-top: 10px; display: inline-block;">Read more →</a>`;
        }
        
        content += '</div></div>';
        
        knowledgePanel.innerHTML = content;
        resultsContainer.appendChild(knowledgePanel);
    }

    createResultItem(result, index) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'result-item';
        
        // Extract domain from URL
        let domain = '';
        try {
            domain = new URL(result.url).hostname.replace('www.', '');
        } catch (e) {
            domain = result.url;
        }
        
        // Create favicon URL
        const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
        
        resultDiv.innerHTML = `
            <div class="result-url">
                ${result.icon ? `<img src="${result.icon}" alt="" class="favicon">` : `<img src="${faviconUrl}" alt="" class="favicon">`}
                <a href="${result.url}" target="_blank">${domain}</a>
            </div>
            <h3 class="result-title">
                <a href="${result.url}" target="_blank">${result.title}</a>
            </h3>
            <p class="result-description">${result.description || 'No description available.'}</p>
            <div class="result-metadata">
                <span>${this.getRandomTime()} •</span>
                <a href="#" class="result-cache" onclick="event.preventDefault(); alert('Cached page not available');">Cached</a>
            </div>
        `;
        
        return resultDiv;
    }

    createRelatedTopics(topics) {
        const relatedDiv = document.createElement('div');
        relatedDiv.className = 'related-searches';
        
        let topicsHTML = '<h3 class="related-title">Related searches</h3><div class="related-list">';
        
        topics.slice(0, 8).forEach(topic => {
            topicsHTML += `
                <a href="#" class="related-item" data-query="${topic.title}">
                    ${topic.title}
                </a>
            `;
        });
        
        topicsHTML += '</div>';
        relatedDiv.innerHTML = topicsHTML;
        
        // Add click events to related items
        relatedDiv.querySelectorAll('.related-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const query = e.target.getAttribute('data-query');
                document.getElementById('searchInput').value = query;
                this.performSearch(query);
            });
        });
        
        document.getElementById('resultsContainer').appendChild(relatedDiv);
    }

    createPagination() {
        const paginationDiv = document.createElement('div');
        paginationDiv.className = 'pagination';
        
        paginationDiv.innerHTML = `
            <a href="#" class="pagination-btn prev">← Previous</a>
            <span style="color: #70757a;">1</span>
            <a href="#" class="pagination-btn next">Next →</a>
        `;
        
        // Add click events
        paginationDiv.querySelector('.next').addEventListener('click', (e) => {
            e.preventDefault();
            this.showMoreResults();
        });
        
        document.getElementById('resultsContainer').appendChild(paginationDiv);
    }

    createNoResultsMessage() {
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'empty-state';
        
        noResultsDiv.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <h3>No results found for "${this.currentQuery}"</h3>
            <p>Try different keywords or check your spelling</p>
            <p style="margin-top: 15px;">
                <a href="https://duckduckgo.com/?q=${encodeURIComponent(this.currentQuery)}" target="_blank" class="search-btn primary">
                    Search on DuckDuckGo
                </a>
            </p>
        `;
        
        return noResultsDiv;
    }

    displayError(error) {
        this.hideLoading();
        
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Search Error</h3>
                <p>${error.message}</p>
                <p style="margin-top: 15px;">
                    <a href="https://duckduckgo.com/?q=${encodeURIComponent(this.currentQuery)}" target="_blank" class="search-btn primary">
                        Search on DuckDuckGo directly
                    </a>
                </p>
            </div>
        `;
    }

    showLoading() {
        document.getElementById('resultsContainer').innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Searching for "${this.currentQuery}"...</p>
            </div>
        `;
    }

    hideLoading() {
        // Loading state is handled by clearing and showing results
    }

    showMoreResults() {
        // In a real implementation, this would fetch more results
        // For now, just redirect to DuckDuckGo
        window.open(`https://duckduckgo.com/?q=${encodeURIComponent(this.currentQuery)}`, '_blank');
    }

    addToHistory(query) {
        // Remove duplicates
        this.searchHistory = this.searchHistory.filter(item => item !== query);
        // Add to beginning
        this.searchHistory.unshift(query);
        // Keep only last 20 searches
        this.searchHistory = this.searchHistory.slice(0, 20);
        
        localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
        this.loadSearchHistory();
    }

    loadSearchHistory() {
        // Could implement a dropdown search history if needed
    }

    updateURL(query) {
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
    }

    getRandomTime() {
        const times = ['2 hours ago', '1 day ago', '3 days ago', '1 week ago', '2 weeks ago'];
        return times[Math.floor(Math.random() * times.length)];
    }
}

// Initialize search engine when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.searchEngine = new SearchEngine();
    
    // Focus search input
    document.getElementById('searchInput').focus();
    
    // Clear search input when 'x' is clicked (modern browsers)
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const clearBtn = document.getElementById('clearSearch');
        if (this.value) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }
    });
    
    // Show/hide clear button initially
    if (!searchInput.value) {
        document.getElementById('clearSearch').style.display = 'none';
    }
});