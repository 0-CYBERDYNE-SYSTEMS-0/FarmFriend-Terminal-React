/**
 * FF-Terminal Interactive Demo System
 * Art Deco terminal interface with GSAP animations
 */

(function() {
    'use strict';

    // ==========================================
    //  DEMO SCENARIOS DATA
    // ==========================================

    const demoScenarios = {
        'inventory': {
            id: 'inventory',
            name: 'Smart Inventory Auto-Stock',
            icon: '📦',
            description: 'Scheduled camera checks → analyze stock → auto-order replacements',
            duration: '~30s playback',
            command: 'Monitor our equipment parts inventory and auto-order replacements when stock gets low',
            output: [
                { type: 'system', text: 'Initializing autonomous inventory management system...' },
                { type: 'command', text: 'schedule_task --name "Parts Inventory Check" --rrule "FREQ=HOURLY;INTERVAL=48"' },
                { type: 'response', text: 'Creating scheduled task: "Parts Inventory Check"' },
                { type: 'response', text: 'RRULE: FREQ=HOURLY;INTERVAL=48' },
                { type: 'response', text: 'Task scheduled. Next run: 2026-01-07 06:00 AM CST' },
                { type: 'progress', label: 'Executing inventory check...', duration: 1500 },
                { type: 'command', text: 'use_camera --device "Camera_7" --capture --analyze' },
                { type: 'response', text: 'Camera_7 captured: "parts_shelf_zone_b.jpg"' },
                { type: 'response', text: 'Analyzing image with computer_vision skill...' },
                { type: 'system', text: '✓ Analysis complete', delay: 800 },
                { type: 'response', text: 'INVENTORY REPORT:' },
                { type: 'list', items: [
                    { icon: '!', text: 'Motor oil 5W-30: 3 gallons (LOW - reorder threshold: 5)' },
                    { icon: '✓', text: 'Hydraulic fluid: 12 gallons (OK)' },
                    { icon: '✓', text: 'Filter elements: 47 units (OK)' },
                    { icon: '!', text: 'Battery terminals: 2 sets (LOW - reorder threshold: 5)' }
                ]},
                { type: 'command', text: 'browser_use --search "5W-30 motor oil bulk pricing" --site "FarmSupplyCo,TractorSupplyPlus"' },
                { type: 'progress', label: 'Searching supplier websites...', duration: 2000 },
                { type: 'response', text: 'PRICE COMPARISON:' },
                { type: 'table', headers: ['Supplier', 'Price/Unit', 'Shipping', 'Total'], rows: [
                    ['FarmSupplyCo', '$24.99/gal', 'FREE', '$74.97'],
                    ['TractorSupplyPlus', '$23.49/gal', '$8.99', '$79.46'],
                    ['AgriDirect', '$25.50/gal', '$12.50', '$89.00']
                ]},
                { type: 'system', text: 'Best value: TractorSupplyPlus', delay: 500 },
                { type: 'command', text: 'validate_part_compatibility --part "motor-oil-5w30" --equipment "John Deere 5085"' },
                { type: 'response', text: '✓ COMPATIBLE: SAE 5W-30 meets spec for John Deere 5085' },
                { type: 'command', text: 'browser_use --order --product "motor-oil-5w30" --quantity "6" --supplier "TractorSupplyPlus"' },
                { type: 'progress', label: 'Placing order...', duration: 1500 },
                { type: 'response', text: '✓ Order #TS-2026-01147 CONFIRMED' },
                { type: 'response', text: 'Expected delivery: 2026-01-07' },
                { type: 'command', text: 'save_document --path "~/farm-logs/orders/" --content "receipt"' },
                { type: 'response', text: 'Receipt saved: ~/farm-logs/orders/2026-01-05_order.pdf' },
                { type: 'system', text: '═══════════════════════════════════════════════════', delay: 500 },
                { type: 'success', text: 'AUTOMATION COMPLETE: 2 items ordered, $15.51 saved vs. next best' }
            ]
        },
        'market': {
            id: 'market',
            name: 'Byproduct Market Intelligence',
            icon: '📊',
            description: 'Research monetization → gap analysis → business plan → pitch deck',
            duration: '~45s playback',
            command: 'Research ways to monetize our farm byproducts and create a business plan',
            output: [
                { type: 'system', text: 'Initializing market intelligence engine...' },
                { type: 'command', text: 'web_research --topic "agricultural byproduct monetization strategies 2025" --sources "50"' },
                { type: 'progress', label: 'Researching market opportunities...', duration: 2500 },
                { type: 'response', text: 'Found 47 relevant sources. Analyzing trends...' },
                { type: 'response', text: 'KEY MONETIZATION OPPORTUNITIES IDENTIFIED:' },
                { type: 'list', items: [
                    { icon: '●', text: 'Whey protein (sports nutrition): $2.8B market, 8.2% CAGR' },
                    { icon: '●', text: 'Manure-to-energy (biogas): ROI 4-6 years, growing demand' },
                    { icon: '●', text: 'Crop residue (biochar): $180-220/ton, sustainable agriculture trend' },
                    { icon: '●', text: 'Farm-to-pet treats: Underserved regional market' }
                ]},
                { type: 'command', text: 'analyze_gaps --market "dairy byproducts" --region "Texas, Southwest"' },
                { type: 'progress', label: 'Analyzing market gaps...', duration: 1800 },
                { type: 'response', text: 'MARKET GAP DETECTED: Local "farm-fresh pet treats"' },
                { type: 'response', text: 'Your dairy produces 1,200 gal/day whey - enough for 200+ lbs protein powder' },
                { type: 'system', text: 'OPPORTUNITY: Zero-competition in 150-mile radius', delay: 500 },
                { type: 'command', text: 'simulate_idea --name "Whey Protein Powder Line" --inputs "whey_output=1200;equipment_cost=85000;space_sqft=800"' },
                { type: 'progress', label: 'Running business simulation...', duration: 2000 },
                { type: 'response', text: 'SIMULATION RESULTS - "Whey Protein Powder Line":' },
                { type: 'table', headers: ['Metric', 'Value', 'Notes'], rows: [
                    ['Equipment Cost', '$85,000', 'Commercial-grade dehydrator'],
                    ['Break-even', 'Month 14', 'At 60% capacity'],
                    ['5-Year NPV', '$312,000', 'Conservative estimate'],
                    ['Risk Level', 'MEDIUM', 'Market entry barrier: low'],
                    ['Jobs Created', '3-4', 'Local employment']
                ]},
                { type: 'command', text: 'generate_business_plan --idea "whey_protein" --format "comprehensive"' },
                { type: 'progress', label: 'Creating business plan...', duration: 2200 },
                { type: 'response', text: '✓ Generated: business_plan_whey_protein_2026.md (15 pages)' },
                { type: 'response', text: 'Includes: Executive summary, financials, operations, marketing strategy' },
                { type: 'command', text: 'generate_pitch_deck --business_plan "business_plan_whey_protein_2026.md"' },
                { type: 'progress', label: 'Building pitch deck...', duration: 1800 },
                { type: 'response', text: '✓ Generated: pitch_deck_q4_2026.pdf (12 slides)' },
                { type: 'response', text: 'Includes: Problem, Solution, Market, Traction, Ask' },
                { type: 'command', text: 'create_landing_page --product "farm-fresh-whey" --style "premium"' },
                { type: 'progress', label: 'Generating landing page...', duration: 1500 },
                { type: 'response', text: '✓ Generated: landing_page_farm_whey.html' },
                { type: 'response', text: 'Ready for deployment at: yourfarm.com/whey-products' },
                { type: 'system', text: '═══════════════════════════════════════════════════', delay: 500 },
                { type: 'success', text: 'INTELLIGENCE COMPLETE: Market opportunity identified + full business package generated' }
            ]
        },
        'optimization': {
            id: 'optimization',
            name: 'Farm Intelligence Dashboard',
            icon: '🌾',
            description: 'Sensor analytics → predictions → optimization → auto-implementation',
            duration: '~35s playback',
            command: 'Generate a complete farm health report and create an optimization plan',
            output: [
                { type: 'system', text: 'Initializing farm intelligence engine...' },
                { type: 'command', text: 'aggregate_sensors --range "30d" --devices "all"' },
                { type: 'progress', label: 'Aggregating sensor data...', duration: 2000 },
                { type: 'response', text: 'Collected 30-day data from 47 IoT devices' },
                { type: 'command', text: 'analyze_patterns --data "sensor_aggregation" --model "predictive"' },
                { type: 'progress', label: 'Running predictive analytics...', duration: 2200 },
                { type: 'response', text: 'FARM HEALTH REPORT - Generated 2026-01-05' },
                { type: 'table', headers: ['Area', 'Status', 'Insight'], rows: [
                    ['Irrigation', 'NEEDS OPTIMIZATION', 'Zone 3 overwatered by 23%'],
                    ['Livestock', 'HEALTHY', 'All temps in normal range'],
                    ['Equipment', 'MAINTENANCE DUE', 'Tractor #2 - oil change in 50 hrs'],
                    ['Energy', 'EFFICIENT', 'Solar at 94% capacity']
                ]},
                { type: 'command', text: 'predict_maintenance --equipment "all" --horizon "90d"' },
                { type: 'response', text: 'PREDICTIVE MAINTENANCE SCHEDULE:' },
                { type: 'list', items: [
                    { icon: '!', text: 'Tractor #2: Oil change - due in 50 hrs (Schedule: Jan 12)' },
                    { icon: '●', text: 'Irrigation valve Z3: Seal replacement - due in 200 hrs' },
                    { icon: '●', text: 'Camera #7: Firmware update - due in 500 hrs' }
                ]},
                { type: 'command', text: 'generate_optimization_plan --focus "water,energy,feed"' },
                { type: 'progress', label: 'Creating optimization plan...', duration: 1500 },
                { type: 'response', text: 'OPTIMIZATION RECOMMENDATIONS:' },
                { type: 'list', items: [
                    { icon: '✓', text: 'Reduce Zone 3 irrigation by 25% - Save 1,400 gal/week' },
                    { icon: '✓', text: 'Shift irrigation to 4AM-6AM - Reduce evaporation 40%' },
                    { icon: '✓', text: 'Enable smart batching for feed distribution - Save 8% feed cost' },
                    { icon: '✓', text: 'Activate solar battery storage mode - Reduce grid 60%' }
                ]},
                { type: 'command', text: 'execute_optimization --plan "auto_safe" --confirm false' },
                { type: 'progress', label: 'Implementing optimizations...', duration: 2000 },
                { type: 'response', text: '✓ Irrigation schedule updated: Zone 3 reduced 25%' },
                { type: 'response', text: '✓ New irrigation window: 4:00 AM - 6:00 AM' },
                { type: 'response', text: '✓ Feed batching: Smart distribution enabled' },
                { type: 'response', text: '✓ Energy: Battery storage mode activated' },
                { type: 'command', text: 'setup_monitoring --metrics "water_usage,energy_consumption,feed_efficiency" --alert_threshold "15%"' },
                { type: 'response', text: 'Continuous monitoring enabled with SMS/SMS alerts' },
                { type: 'system', text: '═══════════════════════════════════════════════════', delay: 500 },
                { type: 'success', text: 'OPTIMIZATION COMPLETE: Est. savings $2,400/month | ROI: 340% year 1' }
            ]
        }
    };

    // ==========================================
    //  TERMINAL CONTROLLER
    // ==========================================

    class TerminalController {
        constructor() {
            this.activeDemo = null;
            this.isPlaying = false;
            this.output = null;
            this.statusElements = {};
            
            this.init();
        }

        init() {
            // Cache DOM elements
            this.output = document.getElementById('terminal-output');
            this.statusElements = {
                demo: document.getElementById('status-demo'),
                timestamp: document.getElementById('status-timestamp'),
                state: document.getElementById('status-state')
            };

            // Bind events
            this.bindScenarioCards();
            this.bindInputTrigger();

            // Set initial timestamp
            this.updateTimestamp();
            setInterval(() => this.updateTimestamp(), 1000);
        }

        bindScenarioCards() {
            const cards = document.querySelectorAll('.demo-scenario-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    const demoId = card.dataset.demo;
                    this.playDemo(demoId);
                });
            });
        }

        bindInputTrigger() {
            const trigger = document.getElementById('input-trigger');
            if (trigger) {
                trigger.addEventListener('click', () => {
                    if (this.activeDemo) {
                        this.restartDemo();
                    }
                });
            }
        }

        async playDemo(demoId) {
            if (this.isPlaying) return;
            
            const scenario = demoScenarios[demoId];
            if (!scenario) return;

            this.isPlaying = true;
            this.activeDemo = demoId;

            // Update UI state
            this.setActiveScenario(demoId);
            this.updateStatus('demo', scenario.name);
            this.updateStatus('state', 'EXECUTING...');
            
            // Clear output
            this.clearOutput();

            // Play demo
            await this.playOutput(scenario);

            // Finish
            this.updateStatus('state', 'READY');
            this.isPlaying = false;
        }

        async restartDemo() {
            if (this.activeDemo) {
                await this.playDemo(this.activeDemo);
            }
        }

        setActiveScenario(demoId) {
            document.querySelectorAll('.demo-scenario-card').forEach(card => {
                card.classList.remove('active');
                if (card.dataset.demo === demoId) {
                    card.classList.add('active');
                }
            });
        }

        updateStatus(type, value) {
            if (this.statusElements[type]) {
                this.statusElements[type].textContent = value;
            }
        }

        updateTimestamp() {
            if (this.statusElements.timestamp) {
                const now = new Date();
                this.statusElements.timestamp.textContent = now.toLocaleTimeString('en-US', { 
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
        }

        clearOutput() {
            if (this.output) {
                this.output.innerHTML = '';
            }
        }

        async playOutput(scenario) {
            // Show command first
            this.addLine('command', `> ${scenario.command}`, 'ff-terminal');

            const line = document.createElement('div');
            line.className = 'terminal-line';
            this.output.appendChild(line);

            // Typing effect for command
            await this.typeText(line, scenario.command, 30);

            // Small pause after command
            await this.delay(500);

            // Play each output item
            for (const item of scenario.output) {
                await this.playOutputItem(item);
                
                // Auto-scroll to bottom
                if (this.output) {
                    this.output.scrollTop = this.output.scrollHeight;
                }
            }
        }

        async playOutputItem(item) {
            const delay = item.delay || 400;

            switch (item.type) {
                case 'system':
                    this.addSystemLine(item.text);
                    break;
                case 'command':
                    this.addCommandLine(item.text);
                    break;
                case 'response':
                    this.addResponseLine(item.text);
                    break;
                case 'success':
                    this.addSuccessLine(item.text);
                    break;
                case 'progress':
                    await this.addProgressBar(item.label, item.duration || 1500);
                    break;
                case 'list':
                    await this.addList(item.items);
                    break;
                case 'table':
                    await this.addTable(item.headers, item.rows);
                    break;
            }

            await this.delay(delay);
        }

        addLine(type, text, prompt = '') {
            const line = document.createElement('div');
            line.className = `terminal-line ${type}`;
            
            if (prompt) {
                const promptEl = document.createElement('span');
                promptEl.className = 'terminal-prompt';
                promptEl.textContent = prompt + ' ';
                line.appendChild(promptEl);
            }

            const textEl = document.createElement('span');
            textEl.className = 'terminal-text';
            textEl.textContent = text;
            line.appendChild(textEl);

            this.output.appendChild(line);
            return line;
        }

        addSystemLine(text) {
            const line = document.createElement('div');
            line.className = 'terminal-line fade-in';
            line.innerHTML = `<span class="terminal-system">${text}</span>`;
            this.output.appendChild(line);
        }

        addCommandLine(text) {
            const line = document.createElement('div');
            line.className = 'terminal-line fade-in';
            line.innerHTML = `<span class="terminal-command">${text}</span>`;
            this.output.appendChild(line);
        }

        addResponseLine(text) {
            const line = document.createElement('div');
            line.className = 'terminal-line fade-in';
            line.innerHTML = `<span class="terminal-response">${text}</span>`;
            this.output.appendChild(line);
        }

        addSuccessLine(text) {
            const line = document.createElement('div');
            line.className = 'terminal-line fade-in';
            line.innerHTML = `<span class="terminal-success">${text}</span>`;
            this.output.appendChild(line);
        }

        async addProgressBar(label, duration) {
            const container = document.createElement('div');
            container.className = 'terminal-progress fade-in';
            container.innerHTML = `
                <div class="progress-label">
                    <span>${label}</span>
                    <span class="progress-percent">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: 0%"></div>
                </div>
            `;
            this.output.appendChild(container);

            const fill = container.querySelector('.progress-fill');
            const percent = container.querySelector('.progress-percent');

            // Animate progress
            const steps = 20;
            const stepDuration = duration / steps;
            
            for (let i = 0; i <= steps; i++) {
                const percentVal = Math.round((i / steps) * 100);
                fill.style.width = `${percentVal}%`;
                percent.textContent = `${percentVal}%`;
                await this.delay(stepDuration);
            }
        }

        async addList(items) {
            const ul = document.createElement('ul');
            ul.className = 'terminal-list stagger-in';

            for (const item of items) {
                const li = document.createElement('li');
                const icon = item.icon === '!' ? '●' : (item.icon === '✓' ? '●' : '●');
                li.innerHTML = `<span class="bullet">${icon}</span><span>${item.text}</span>`;
                ul.appendChild(li);
            }

            this.output.appendChild(ul);
        }

        async addTable(headers, rows) {
            const table = document.createElement('table');
            table.className = 'terminal-table fade-in';
            
            // Header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headers.forEach(h => {
                const th = document.createElement('th');
                th.textContent = h;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            // Body
            const tbody = document.createElement('tbody');
            rows.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(cell => {
                    const td = document.createElement('td');
                    td.textContent = cell;
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);

            this.output.appendChild(table);
        }

        async typeText(element, text, speed = 30) {
            const textSpan = element.querySelector('.terminal-text') || element;
            textSpan.textContent = '';
            
            for (let i = 0; i < text.length; i++) {
                textSpan.textContent = text.substring(0, i + 1);
                await this.delay(speed);
            }
        }

        delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    // ==========================================
    //  INITIALIZATION
    // ==========================================

    document.addEventListener('DOMContentLoaded', () => {
        window.terminalController = new TerminalController();
    });

})();
