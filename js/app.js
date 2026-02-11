// js/app.js - Lógica Vetta Solar con Radiación Real (PVGIS)

// --- CONFIGURACIÓN Y ESTADO ---
let map;
let drawingManager;
let currentPolygon = null;
let maxPanelsPossible = 20;

// Estado del usuario (Aquí guardamos todo)
let userData = {
    lat: 39.5700, // Latitud por defecto (Valencia)
    lng: -0.5300, // Longitud por defecto
    area: 0,
    bill: 100,
    habit: 'night',
    salary: 0,
    roofType: 'sloped',
    equipment: [],
    kWp: 0,
    panels: 0,
    extras: { battery: false, charger: false, wallet: true },
    isFinanced: false,
    grossPrice: 0,
    finalPrice: 0,
    monthlyInstallment: 0,
    netPrice: 0
};

// --- 1. INICIALIZACIÓN DEL MAPA (GOOGLE MAPS) ---
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: userData.lat, lng: userData.lng },
        zoom: 12,
        mapTypeId: 'satellite',
        disableDefaultUI: true,
        zoomControl: true,
        fullscreenControl: false,
        streetViewControl: false
    });

    const input = document.getElementById('googleAddressInput');
    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', map);

    // Cuando el usuario elige una dirección:
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) return;

        // IMPORTANTE: Guardamos las coordenadas reales para la API Solar
        userData.lat = place.geometry.location.lat();
        userData.lng = place.geometry.location.lng();
        console.log("📍 Ubicación guardada:", userData.lat, userData.lng);

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(20);
        }
        setDrawingMode('polygon');
    });

    // Configuración del lápiz de dibujo
    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: null,
        drawingControl: false,
        polygonOptions: {
            fillColor: '#10b981',
            fillOpacity: 0.5,
            strokeWeight: 2,
            strokeColor: '#fff',
            clickable: false,
            editable: true,
            zIndex: 1
        }
    });
    drawingManager.setMap(map);

    // Cuando termina de dibujar el tejado:
    google.maps.event.addListener(drawingManager, 'polygoncomplete', function (polygon) {
        if (currentPolygon) currentPolygon.setMap(null);
        currentPolygon = polygon;
        drawingManager.setDrawingMode(null);
        document.getElementById('btnDraw').classList.remove('tool-active');

        const area = google.maps.geometry.spherical.computeArea(polygon.getPath());
        userData.area = area.toFixed(2);
        updateUI();
    });
}

function setDrawingMode(mode) {
    if (mode === 'polygon') {
        drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        document.getElementById('btnDraw').classList.add('tool-active');
    } else {
        drawingManager.setDrawingMode(null);
        document.getElementById('btnDraw').classList.remove('tool-active');
    }
}

function clearMap() {
    if (currentPolygon) {
        currentPolygon.setMap(null);
        currentPolygon = null;
    }
    userData.area = 0;
    updateUI();
    setDrawingMode(null);
}

// --- 2. INTERFAZ DE USUARIO (UI) ---
function updateUI() {
    document.getElementById('areaDisplay').innerText = userData.area;
    const btn = document.getElementById('btnNext1');
    const areaText = document.getElementById('areaText');
    const estimate = document.getElementById('panelEstimate');

    if (userData.area > 0) {
        areaText.classList.replace('text-slate-300', 'text-brand-primary');
        let panelCount = Math.floor(userData.area / 2.2);
        estimate.innerText = `Caben ~${panelCount} paneles`;
        btn.disabled = false;
        btn.classList.remove('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
        btn.classList.add('bg-slate-900', 'text-white', 'hover:bg-slate-800', 'shadow-lg');
    } else {
        areaText.classList.replace('text-brand-primary', 'text-slate-300');
        estimate.innerText = "Usa el lápiz para dibujar";
        btn.disabled = true;
        btn.classList.add('bg-slate-200', 'text-slate-400', 'cursor-not-allowed');
        btn.classList.remove('bg-slate-900', 'text-white', 'hover:bg-slate-800', 'shadow-lg');
    }
}

function goToStep(n) {
    const sidebar = document.getElementById('sidebar');
    const drawingTools = document.getElementById('drawingTools');

    document.getElementById('step1').classList.add('hidden');
    document.getElementById('step2').classList.add('hidden');
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step' + n).classList.remove('hidden');

    if (n === 1) {
        sidebar.classList.add('h-[45vh]', 'bottom-0', 'rounded-t-[2rem]');
        sidebar.classList.remove('h-full', 'top-0');
        sidebar.classList.add('md:w-[450px]', 'md:right-0', 'md:left-auto');
        sidebar.classList.remove('md:w-full', 'md:left-0');
        drawingTools.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        sidebar.classList.remove('h-[45vh]', 'bottom-0', 'rounded-t-[2rem]');
        sidebar.classList.add('h-full', 'top-0');
        sidebar.classList.remove('md:w-[450px]', 'md:right-0', 'md:left-auto');
        sidebar.classList.add('md:w-full', 'md:left-0');
        drawingTools.classList.add('opacity-0', 'pointer-events-none');
        if (n === 3) document.getElementById('step3').classList.add('flex');
    }
}

function toggleEquipment(item) {
    const index = userData.equipment.indexOf(item);
    const el = document.getElementById('eq_' + item);
    if (!el) return;

    const icon = el.querySelector('svg');
    const text = el.querySelector('span');

    if (index === -1) {
        userData.equipment.push(item);
        el.classList.add('border-emerald-500', 'bg-emerald-50');
        el.classList.remove('border-slate-200');
        icon.classList.add('text-emerald-600');
        icon.classList.remove('text-slate-400');
        text.classList.add('text-emerald-700');
        text.classList.remove('text-slate-500');
    } else {
        userData.equipment.splice(index, 1);
        el.classList.remove('border-emerald-500', 'bg-emerald-50');
        el.classList.add('border-slate-200');
        icon.classList.remove('text-emerald-600');
        icon.classList.add('text-slate-400');
        text.classList.remove('text-emerald-700');
        text.classList.add('text-slate-500');
    }
}

function setRoofType(type) {
    userData.roofType = type;
    const btnSloped = document.getElementById('roof_sloped');
    const btnFlat = document.getElementById('roof_flat');

    if (type === 'sloped') {
        btnSloped.className = "flex-1 py-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs md:text-sm transition";
        btnFlat.className = "flex-1 py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl text-xs md:text-sm transition hover:border-emerald-200";
    } else {
        btnFlat.className = "flex-1 py-3 border-2 border-emerald-500 bg-emerald-50 text-emerald-700 font-bold rounded-xl text-xs md:text-sm transition";
        btnSloped.className = "flex-1 py-3 border-2 border-slate-200 text-slate-500 font-bold rounded-xl text-xs md:text-sm transition hover:border-emerald-200";
    }
}

// --- 3. NUEVA LÓGICA CIENTÍFICA (PVGIS API) ---
// SUSTITUYE ESTA FUNCIÓN EN js/app.js
async function getSolarDataPVGIS(lat, lng) {
    if (!lat || !lng || lat === 0) return 1500;

    // Intentaremos hasta 3 veces con tiempos de espera más largos
    for (let intento = 1; intento <= 3; intento++) {
        try {
            console.log(`🛰️ Intento ${intento} para Lat: ${lat}, Lng: ${lng}...`);

            const urlOriginal = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat}&lon=${lng}&peakpower=1&loss=14&angle=35&aspect=0&outputformat=json`;
            const urlConPuente = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlOriginal)}`;
            
            // Subimos el tiempo de espera a 8 segundos para el primer "despertar"
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(urlConPuente, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error("Error de conexión");

            const data = await response.json();
            const production = data.outputs.totals.fixed.E_y;

            console.log("✅ ¡Conseguido! Radiación real:", production);
            return production;

        } catch (error) {
            console.warn(`⚠️ Intento ${intento} fallido. Reintentando...`);
            
            // Si es el último intento, devolvemos 1500
            if (intento === 3) {
                console.error("❌ Fallo definitivo tras 3 intentos. Usando 1500.");
                return 1500;
            }
            // Esperamos un segundo antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
}

// --- 4. FUNCIÓN PRINCIPAL DE CÁLCULO (Modificada) ---
async function calculateAndShowResults() {
    // 1. Feedback visual en el botón para que el usuario sepa que está trabajando
    const btn = document.querySelector("button[onclick='calculateAndShowResults()']");
    if(btn) btn.innerHTML = `<span class="animate-pulse">🛰️ Consultando Satélite...</span>`;

    try {
        // 2. Obtener la radiación real (Asegúrate de haber buscado una dirección en el mapa antes)
        const solarRadiation = await getSolarDataPVGIS(userData.lat, userData.lng);
        
        // 3. CONEXIÓN CON LA INSIGNIA (Aquí es donde arreglamos el "0")
        const valText = document.getElementById('radValue');
        const qualText = document.getElementById('radQual');
        
        if (valText && qualText) {
            valText.innerText = Math.floor(solarRadiation); // Cambiamos el 0 por el dato real
            
            // Le ponemos la nota de calidad
            if(solarRadiation >= 1600) {
                qualText.innerText = "EXCELENTE";
                qualText.style.color = "#059669"; 
            } else if(solarRadiation >= 1300) {
                qualText.innerText = "MUY BUENA";
                qualText.style.color = "#2563eb";
            } else {
                qualText.innerText = "ESTÁNDAR";
                qualText.style.color = "#64748b";
            }
        }

        // 4. Continuar con el resto de cálculos
        recalculateFinancials();
        goToStep(3); // Saltar a la pantalla de resultados

    } catch (error) {
        console.error("Error en el cálculo:", error);
        // Si falla el satélite, forzamos el paso al paso 3 para que no se quede colgado
        goToStep(3);
    } finally {
        if(btn) btn.innerHTML = `<span>Generar Estudio Completo</span>`;
    }
}

function updateSystemFromSlider(val) {
    userData.panels = parseInt(val);
    userData.kWp = userData.panels * 0.450;
    document.getElementById('panelsControlDisplay').innerText = userData.panels + " Paneles";
    recalculateFinancials();
}

function toggleExtra(type) {
    userData.extras[type] = !userData.extras[type];
    updateExtrasUI();
    recalculateFinancials();
}

function updateExtrasUI() {
    ['battery', 'charger'].forEach(type => {
        const card = document.getElementById('card' + type.charAt(0).toUpperCase() + type.slice(1));
        const circle = card.querySelector('.check-circle');
        const dot = card.querySelector('.check-dot');
        
        const activeColor = type === 'battery' ? 'pink' : 'blue';
        const borderColor = type === 'battery' ? 'border-pink-500' : 'border-blue-500';
        const bgColor = type === 'battery' ? 'bg-pink-50' : 'bg-blue-50';
        const circleBg = type === 'battery' ? 'bg-pink-500' : 'bg-blue-500';

        if(userData.extras[type]) {
            card.classList.add(borderColor, bgColor);
            card.classList.remove('border-slate-200', 'bg-white');
            circle.classList.add(circleBg, 'border-transparent');
            circle.classList.remove('border-slate-200');
            dot.classList.remove('scale-0');
        } else {
            card.classList.remove(borderColor, bgColor);
            card.classList.add('border-slate-200', 'bg-white');
            circle.classList.remove(circleBg, 'border-transparent');
            circle.classList.add('border-slate-200');
            dot.classList.add('scale-0');
        }
    });
}

// --- 5. FINANZAS Y EXPORTACIÓN ---
function setFinancing(isFinanced) {
    userData.isFinanced = isFinanced;
    const toggleBg = document.getElementById('financeToggleBg');
    const textContado = document.getElementById('btnContadoText');
    const textFinanciado = document.getElementById('btnFinanciadoText');
    const prefix = document.getElementById('pricePrefix');
    const subtitle = document.getElementById('priceSubtitle');
    const breakdown = document.getElementById('priceBreakdown');
    const financedMsg = document.getElementById('financedMessage');

    if(isFinanced) {
        toggleBg.style.left = '50%';
        textContado.classList.replace('text-white', 'text-slate-400');
        textFinanciado.classList.replace('text-slate-400', 'text-white');
        prefix.classList.remove('hidden');
        subtitle.innerText = "Cuota mensual estimada (120 meses)";
        breakdown.classList.add('hidden');
        financedMsg.classList.remove('hidden');
    } else {
        toggleBg.style.left = '4px';
        textFinanciado.classList.replace('text-white', 'text-slate-400');
        textContado.classList.replace('text-slate-400', 'text-white');
        prefix.classList.add('hidden');
        subtitle.innerText = "Inversión Inicial";
        breakdown.classList.remove('hidden');
        financedMsg.classList.add('hidden');
    }
    updatePriceDisplay();
}

function recalculateFinancials() {
    let baseCost = (userData.kWp * 1100) + 1500; 
    if(userData.extras.battery) baseCost += 3000;
    if(userData.extras.charger) baseCost += 1500;
    
    userData.grossPrice = baseCost;
    userData.finalPrice = userData.grossPrice;

    const euSubsidy = 2400; 
    let irpfDeductionPotential = userData.grossPrice * 0.40;
    let finalIrpfDeduction = 0;
    if (userData.salary > 0) {
        finalIrpfDeduction = Math.min(irpfDeductionPotential, userData.salary);
    }
    userData.netPrice = userData.grossPrice - euSubsidy - finalIrpfDeduction;

    document.getElementById('irpfDeductionVal').innerText = "-" + Math.floor(finalIrpfDeduction).toLocaleString() + "€";
    document.getElementById('netPriceVal').innerText = Math.floor(userData.netPrice).toLocaleString() + "€";

    const r = 0.065 / 12; 
    const n = 120;
    userData.monthlyInstallment = (userData.finalPrice * r * Math.pow(1+r, n)) / (Math.pow(1+r, n) - 1);
    
    // CÁLCULO DE AHORRO
    let savingsPercent = 0.55; 
    if(userData.extras.battery) savingsPercent = 0.90;
    
    let productionRatio = (userData.kWp * 1500) / ((userData.bill / 0.20) * 12);
    if(productionRatio > 1.2 && !userData.extras.battery) savingsPercent += 0.05; 
    if(savingsPercent > 0.95) savingsPercent = 0.95;

    const monthlyBill = userData.bill;
    const newMonthlyBill = monthlyBill * (1 - savingsPercent);
    const monthlySavings = monthlyBill - newMonthlyBill;
    const trees = Math.floor(monthlySavings / 4); 

    document.getElementById('oldBillText').innerText = monthlyBill + "€";
    document.getElementById('newBillText').innerText = Math.floor(newMonthlyBill) + "€";
    document.getElementById('savingsPercent').innerText = "-" + Math.floor(savingsPercent * 100) + "%";
    
    const remainingPercent = (1 - savingsPercent) * 100;
    const visualHeight = Math.max(remainingPercent, 2);
    
    setTimeout(() => {
        const bar = document.getElementById('newBillBar');
        if(bar) bar.style.height = visualHeight + "%";
    }, 100);

    document.getElementById('headerPower').innerText = userData.kWp.toFixed(2) + " kWp";
    
    const treesEl = document.getElementById('treesValue');
    animateValue(treesEl, parseInt(treesEl.innerText), trees, 1000);

    updatePriceDisplay();
    updateWhatsApp();
}

function animateValue(obj, start, end, duration, isCurrency = false) {
    if(start === end) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const value = Math.floor(progress * (end - start) + start);
        obj.innerHTML = isCurrency ? value.toLocaleString() : value;
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

function updatePriceDisplay() {
    const display = document.getElementById('mainPriceDisplay');
    const currentVal = parseInt(display.innerText.replace(/\D/g,'')) || 0;
    let targetVal = userData.isFinanced ? Math.floor(userData.monthlyInstallment) : Math.floor(userData.finalPrice);
    animateValue(display, currentVal, targetVal, 500, true);
}

function updateWhatsApp() {
    let equipmentText = userData.equipment.length > 0 ? userData.equipment.join(', ') : 'Ninguno';
    let msg = `Hola VETTA. Estudio Ref: ${Date.now().toString().slice(-4)}
📍 Tejado: ${userData.area}m2 (${userData.roofType})
⚡ Potencia: ${userData.kWp.toFixed(2)}kWp (${userData.panels} paneles)
🔋 Batería: ${userData.extras.battery ? 'SÍ' : 'NO'}
🔌 Cargador: ${userData.extras.charger ? 'SÍ' : 'NO'}
🏠 Equipamiento: ${equipmentText}
💰 Precio Neto Estimado: ${Math.floor(userData.netPrice)}€
Solicito confirmar visita.`;
    document.getElementById('whatsappBtn').href = `https://wa.me/34600000000?text=${encodeURIComponent(msg)}`;
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFillColor(15, 23, 42); 
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(22);
    doc.text("VETTA | Estudio Solar", 20, 25);
    
    doc.setTextColor(0,0,0);
    doc.setFontSize(14);
    doc.text("Detalles Técnicos", 20, 60);
    doc.setFontSize(11);
    doc.setTextColor(100,100,100);
    doc.text(`Superficie: ${userData.area} m2`, 20, 75);
    doc.text(`Potencia: ${userData.kWp.toFixed(2)} kWp (${userData.panels} Paneles)`, 20, 85);
    doc.text(`Batería: ${userData.extras.battery ? 'Incluida' : 'No incluida'}`, 20, 95);
    doc.text(`Cargador VE: ${userData.extras.charger ? 'Incluido' : 'No incluido'}`, 20, 105);
    
    doc.setFontSize(14);
    doc.setTextColor(0,0,0);
    doc.text("Desglose Económico", 20, 130);
    doc.setFontSize(11);
    doc.setTextColor(100,100,100);
    doc.text(`Inversión Inicial: ${Math.floor(userData.finalPrice).toLocaleString()} €`, 20, 145);
    doc.setTextColor(16, 185, 129);
    doc.text(`- Subvención UE: 2.400 €`, 20, 155);
    doc.text(`- Deducción IRPF: ${Math.floor(userData.grossPrice * 0.40).toLocaleString()} € (Est.)`, 20, 165);
    
    doc.setTextColor(0,0,0);
    doc.setFontSize(16);
    doc.text(`Coste Real: ${Math.floor(userData.netPrice).toLocaleString()} €`, 20, 185);

    doc.save("Estudio_VETTA.pdf");
}