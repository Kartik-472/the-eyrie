const quotes = [
    { text: "Do not save what is left after spending, but spend what is left after saving.", author: "Warren Buffett" },
    { text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin" },
    { text: "Risk comes from not knowing what you're doing.", author: "Warren Buffett" },
    { text: "Beware of little expenses; a small leak will sink a great ship.", author: "Benjamin Franklin" },
    { text: "Money is a terrible master but an excellent servant.", author: "P.T. Barnum" },
    { text: "Formal education will make you a living; self-education will make you a fortune.", author: "Jim Rohn" },
    { text: "It's not how much money you make, how much money you keep, and how hard it works for you.", author: "Robert Kiyosaki" },
    { text: "The stock market is designed to transfer money from the active to the patient.", author: "Warren Buffett" },
    { text: "Budgeting isn't about limiting your freedom; it's about creating the freedom to pursue what you want.", author: "Anonymous" }
];

function loadRandomQuote() {
    const quoteText = document.getElementById('quote-text');
    const quoteAuthor = document.getElementById('quote-author');
    if (quoteText && quoteAuthor) {
        const randomObj = quotes[Math.floor(Math.random() * quotes.length)];
        quoteText.textContent = `"${randomObj.text}"`;
        quoteAuthor.textContent = `— ${randomObj.author}`;
    }
}

// --- 1. Landing Page Chart ---
window.addEventListener('DOMContentLoaded', async () => {
    loadRandomQuote();
    const homeCtx = document.getElementById('budgetOverviewChart');
    if (homeCtx) {
        // Default data
        let chartLabels = ['Needs (50%)', 'Wants (30%)', 'Savings (20%)'];
        let chartData = [50, 30, 20];

        // Try to fetch the latest saved budget from the backend
        try {
            const res = await fetch('/api/budgets');
            const budgets = await res.json();
            if (budgets && budgets.length > 0) {
                const latest = budgets[0]; // Most recent
                const plan = JSON.parse(latest.optimized_plan);
                chartLabels = Object.keys(plan);
                chartData = Object.values(plan);
            }
        } catch (e) {
            console.log('Using default chart data');
        }

        new Chart(homeCtx, {
            type: 'doughnut',
            data: {
                labels: chartLabels,
                datasets: [{
                    data: chartData,
                    backgroundColor: ['#2563eb', '#38bdf8', '#9333ea', '#10b981', '#f59e0b', '#ef4444']
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
});

// --- 2. Budget Optimizer Logic ---
let activeChart = null;

async function calculateBudget() {
    const totalInput = document.getElementById('totalAmount').value;
    const total = parseFloat(totalInput);

    const checkboxes = document.querySelectorAll('input[name="priority"]:checked');
    const priorities = Array.from(checkboxes).map(cb => cb.value);

    if (!total || total <= 0) {
        alert('Please enter a valid total amount.');
        return;
    }
    if (priorities.length === 0) {
        alert('Please select at least one priority category.');
        return;
    }

    try {
        const response = await fetch('/api/budget', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total, priorities })
        });

        const data = await response.json();
        if (response.ok) {
            renderOptimizedPlan(data.total, data.plan);
        } else {
            alert('Error generating plan: ' + data.error);
        }
    } catch (err) {
        console.error('Network error:', err);
        alert('Failed to connect to backend server.');
    }
}

function renderOptimizedPlan(total, plan) {
    const resultCard = document.getElementById('resultCard');
    resultCard.style.display = 'block';

    const labels = Object.keys(plan);
    const values = Object.values(plan);

    const breakdownList = document.getElementById('breakdownList');
    breakdownList.innerHTML = '<h4>Category Breakdown:</h4>' +
        labels.map(l => `<p><strong>${l}:</strong> ₹${plan[l]}</p>`).join('');

    const ctx = document.getElementById('optimizedChart').getContext('2d');
    if (activeChart) {
        activeChart.destroy();
    }

    activeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#2563eb', '#38bdf8', '#9333ea', '#10b981', '#f59e0b', '#ef4444']
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });

    resultCard.scrollIntoView({ behavior: 'smooth' });
}

// --- 3. AI Chatbot Widget Logic ---
function toggleChat() {
    const popup = document.getElementById('chatPopup');
    popup.style.display = popup.style.display === 'flex' ? 'none' : 'flex';
}

function handleChatEnter(event) {
    if (event.key === 'Enter') {
        sendChatMessage();
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    appendMessage(message, 'user');
    input.value = '';

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (response.ok) {
            appendMessage(data.reply, 'bot');
        } else {
            appendMessage('Sorry, I encountered an error answering that.', 'bot');
        }
    } catch (err) {
        appendMessage('Network connection error.', 'bot');
    }
}

function appendMessage(text, sender) {
    const chatBody = document.getElementById('chatBody');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${sender}`;
    msgDiv.textContent = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function sendPreset(questionText) {
    document.getElementById('chatInput').value = questionText;
    sendChatMessage();
}