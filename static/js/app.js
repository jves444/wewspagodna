import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getStorage, ref, listAll, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjFcF9fqGTXWODNo6yLGY3CjMB-F9E1Ag",
    authDomain: "terrasense-v1.firebaseapp.com",
    projectId: "terrasense-v1",
    storageBucket: "terrasense-v1.appspot.com",
    messagingSenderId: "862515123214",
    appId: "1:862515123214:web:74ae932c1ed90f7681585f",
    measurementId: "G-HHRKDNBQ9Y",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// DOM Elements
const authModal = document.getElementById("auth-modal");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const googleLoginButton = document.getElementById("googleLoginButton");
const userEmailDisplay = document.getElementById("user-email-display");
const loginText = document.getElementById("loginText");
const loginIcon = document.getElementById("loginIcon");
const retrieveButton = document.getElementById("retrieve-csv");
const overlay = document.getElementById("overlay");
const popupForm = document.getElementById("popupForm");
const closeBtn = popupForm?.querySelector(".close-btn");
const fileList = document.getElementById("fileList");
const evaluateButton = document.getElementById("evaluateButton");
const deleteButton = document.getElementById("deleteButton");

// CSV Folder Reference
const csvFolderRef = ref(storage, "csv_uploads");

// Auth Modal Handlers
window.openAuthModal = () => authModal && (authModal.style.display = "block");
window.closeAuthModal = () => authModal && (authModal.style.display = "none");

// Auth Functions
window.createAccount = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Please enter both email and password.");

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Account created! Please log in.");
        closeAuthModal();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.login = async () => {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    if (!email || !password) return alert("Please enter both email and password.");

    try {
        await signInWithEmailAndPassword(auth, email, password);
        closeAuthModal();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        closeAuthModal();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
};

window.logout = async () => {
    try {
        await signOut(auth);
        alert("You have been logged out.");
    } catch (error) {
        alert(error.message);
    }
};

// UI Update Based on Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginText.textContent = "Logout";
        loginIcon.textContent = "🚪";
        logoutButton && (logoutButton.style.display = "inline-block");
        userEmailDisplay.textContent = `Logged in as: ${user.email}`;
        userEmailDisplay.style.display = "block";
    } else {
        loginText.textContent = "Login";
        loginIcon.textContent = "🔑";
        logoutButton && (logoutButton.style.display = "none");
        userEmailDisplay.style.display = "none";

        // Clear all displayed results and data when logged out
        document.getElementById("nitrogen-output").textContent = "";
        document.getElementById("phosphorus-output").textContent = "";
        document.getElementById("potassium-output").textContent = "";
        document.getElementById("ph-output").textContent = "";
        document.getElementById("soil_moisture-condition").textContent = "";

        // Clear table
        const tableBody = document.querySelector("#csvTable tbody");
        if (tableBody) tableBody.innerHTML = "";

        // Destroy chart if exists
        if (npkChartInstance) {
            npkChartInstance.destroy();
            npkChartInstance = null;
        }

        // Clear recommendations
        const recommendationDiv = document.getElementById("recommendation");
        if (recommendationDiv) {
            recommendationDiv.innerHTML = ""; // Clear previous recommendations
        }

        // Clear CSV file selection
        const fileList = document.getElementById("fileList");
        if (fileList) {
            fileList.innerHTML = ""; // Clear the file list
        }

        // Disable evaluate button
        const evaluateButton = document.getElementById("evaluateButton");
        if (evaluateButton) {
            evaluateButton.disabled = true;
        }
        // --- CLEAR prediction ---
        const predictionCategory = document.getElementById("prediction-category");
        const predictionIndicator = document.getElementById("prediction-indicator");

        if (predictionCategory) {
            predictionCategory.textContent = "--"; // Reset prediction
        }
        if (predictionIndicator) {
            predictionIndicator.classList.remove('poor-risk', 'moderate-risk', 'high-risk'); // Remove classes
        }
    }
});

// Popup Handling
const openPopup = async () => {
    overlay.style.display = "block";
    popupForm.style.display = "block";
    await loadCSVFiles();
};

window.closePopup = () => {
    overlay.style.display = "none";
    popupForm.style.display = "none";
};
function getRecommendationText(status) {
    switch (status) {
        case 'Low':
            return 'Consider increasing nutrient levels.';
        case 'Moderate':
            return 'The levels are acceptable, but improvement is possible.';
        case 'High':
            return 'The levels are good, no significant changes needed.';
        case 'Optimal':
            return 'The levels are optimal for plant growth.';
        default:
            return '';
    }
}

let npkChartInstance;

// Load CSV Files
const loadCSVFiles = async () => {
    fileList.innerHTML = "";

    try {
        const res = await listAll(csvFolderRef);

        if (res.items.length === 0) {
            fileList.innerHTML = "<p>No CSV files found.</p>";
            return;
        }

        evaluateButton.disabled = true;

        res.items.forEach(itemRef => {
            const listItem = document.createElement("div");
            listItem.textContent = itemRef.name;
            listItem.classList.add("file-item");
            fileList.appendChild(listItem);

            listItem.addEventListener("click", () => {
                listItem.classList.toggle("selected");
                updateEvaluateButton();
                loadCSVFileAndDisplayData(itemRef.name);
            });
        });

    } catch (error) {
        console.error(error);
        fileList.innerHTML = `<p>Error loading files: ${error.message}</p>`;
    }
};

evaluateButton.addEventListener("click", async () => {
    const selectedItems = document.querySelectorAll(".file-item.selected");

    if (selectedItems.length !== 2) {
        alert("Please select exactly 2 files.");
        return;
    }

    const formData = new FormData();

    for (let i = 0; i < selectedItems.length; i++) {
        const filename = selectedItems[i].textContent.trim();
        try {
            const url = await getDownloadURL(ref(storage, `csv_uploads/${filename}`));
            const fileBlob = await (await fetch(url)).blob();
            formData.append(`file${i + 1}`, fileBlob, filename);
        } catch (error) {
            console.error(error);
            alert(`Error fetching file ${filename}: ${error.message}`);
            return;
        }
    }

    try {
        // const response = await fetch("http://localhost:5000/evaluate", { method: "POST", body: formData });
        const response = await fetch("/evaluate", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            alert(`Error: ${errorText || "Unknown error"}`);
            return;
        }

        const responseJson = await response.json();
        console.log("API Response:", responseJson);

        if (responseJson && responseJson.message && responseJson.prediction) {
            // ✅ After getting prediction, now also refresh displayData:
            await displayData(window.d0Data, window.d1Data, responseJson);

            // ✅ Close popup after evaluation done
            closePopup();
        } else {
            console.error("API response structure is unexpected:", responseJson);
            alert("Error: Unexpected response format from the server.");
        }

    } catch (error) {
        console.error("Error during evaluation:", error);
        alert(`Error during evaluation: ${error.message}`);
    }
});

// Load CSV and Parse
const loadCSVFileAndDisplayData = async (filename) => {
    try {
        const url = await getDownloadURL(ref(storage, `csv_uploads/${filename}`));
        const csvText = await (await fetch(url)).text();
        const parsedData = parseCSV(csvText);

        if (filename.includes("D0")) window.d0Data = parsedData;
        if (filename.includes("D1")) window.d1Data = parsedData;

        if (window.d0Data && window.d1Data) displayData(window.d0Data, window.d1Data);
    } catch (error) {
        console.error(error);
        alert(`Error fetching or parsing file: ${error.message}`);
    }
};

const parseCSV = (csvText) => {
    const rows = csvText.trim().split("\n");
    const headers = rows[0].split(",");

    // Debug: Log headers to check if they match expectations
    console.log("CSV Headers: ", headers);

    return rows.slice(1).map(row => {
        const values = row.split(",");
        return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || "";
            return obj;
        }, {});
    });
};

const displayData = async (d0Data, d1Data, responseJson) => {
    const tableBody = document.querySelector("#csvTable tbody");
    tableBody.innerHTML = ""; // Clear previous rows
    const maxRows = Math.max(d0Data.length, d1Data.length);

    for (let i = 0; i < maxRows; i++) {
        const d0 = d0Data[i] || {};
        const d1 = d1Data[i] || {};
        const row = `
            <tr>
                <td>${d0.Date || ""}</td>
                <td>${d0.Time || ""}</td>
                <td>${d0.Nitrogen ? d0.Nitrogen + " ppm" : ""}</td>
                <td>${d0.Phosphorus ? d0.Phosphorus + " ppm" : ""}</td>
                <td>${d0.Potassium ? d0.Potassium + " ppm" : ""}</td>
                <td>${d1.Soil_Moisture ? d1.Soil_Moisture + " %" : ""}</td>
                <td>${d1.Soil_pH || ""}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    }

    // --- Calculate Mode and Mean Values ---
    const getMode = (arr) => {
        const frequency = {};
        let maxFreq = 0;
        let mode;

        arr.forEach(value => {
            if (value !== undefined && value !== null && value !== "") {
                frequency[value] = (frequency[value] || 0) + 1;
                if (frequency[value] > maxFreq) {
                    maxFreq = frequency[value];
                    mode = value;
                }
            }
        });
        return mode;
    };

    const getMean = (arr) => {
        if (arr.length === 0) return undefined;
        const sum = arr.reduce((acc, val) => acc + val, 0);
        return (sum / arr.length).toFixed(2); // rounded to 2 decimal places
    };

    const nitrogenValues = d0Data.map(d => parseFloat(d.Nitrogen)).filter(v => !isNaN(v));
    const phosphorusValues = d0Data.map(d => parseFloat(d.Phosphorus)).filter(v => !isNaN(v));
    const potassiumValues = d0Data.map(d => parseFloat(d.Potassium)).filter(v => !isNaN(v));
    const soilPhValues = d1Data.map(d => parseFloat(d.Soil_pH)).filter(v => !isNaN(v));
    const moistureValues = d1Data.map(d => parseFloat(d.Soil_Moisture)).filter(v => !isNaN(v));

    const modeNitrogen = getMode(nitrogenValues);
    const modePhosphorus = getMode(phosphorusValues);
    const modePotassium = getMode(potassiumValues);
    const meanPh = getMean(soilPhValues); // <-- use mean for pH
    const modeMoisture = getMode(moistureValues);

    // --- Update Other Values ---
    document.getElementById("nitrogen-output").textContent = modeNitrogen !== undefined ? `${modeNitrogen} ppm` : "--";
    document.getElementById("phosphorus-output").textContent = modePhosphorus !== undefined ? `${modePhosphorus} ppm` : "--";
    document.getElementById("potassium-output").textContent = modePotassium !== undefined ? `${modePotassium} ppm` : "--";
    document.getElementById("ph-output").textContent = meanPh !== undefined ? meanPh : "--";
    document.getElementById("soil_moisture-condition").textContent = modeMoisture !== undefined ? (modeMoisture < 470 ? "Wet" : (modeMoisture >= 470 && modeMoisture <= 635 ? "Moist" : "Dry")) : "--";

    // --- Update Pie Chart ---
    const ctx = document.getElementById('npkChart').getContext('2d');

    if (window.npkChartInstance) {
        window.npkChartInstance.destroy();
    }

    const chartColors = getComputedStyle(document.documentElement);

    window.npkChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Nitrogen', 'Phosphorus', 'Potassium', 'Soil pH'],
            datasets: [{
                label: 'Soil Nutrient and pH Distribution',
                data: [
                    modeNitrogen || 0,
                    modePhosphorus || 0,
                    modePotassium || 0,
                    meanPh || 0 // <-- mean for pH
                ],
                backgroundColor: [
                    chartColors.getPropertyValue('--color-nitrogen').trim(),
                    chartColors.getPropertyValue('--color-phosphorus').trim(),
                    chartColors.getPropertyValue('--color-potassium').trim(),
                    chartColors.getPropertyValue('--color-ph').trim()
                ],
                borderColor: [
                    chartColors.getPropertyValue('--border-nitrogen').trim(),
                    chartColors.getPropertyValue('--border-phosphorus').trim(),
                    chartColors.getPropertyValue('--border-potassium').trim(),
                    chartColors.getPropertyValue('--border-ph').trim()
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            }
        }
    });

    // --- Call displayRecommendations Function ---
    displayRecommendations(meanPh, modeNitrogen, modePhosphorus, modePotassium);

    // --- Update Prediction Section ---
    if (responseJson && responseJson.message && responseJson.prediction) {
        const prediction = responseJson.prediction;

        // Update the prediction display on the page
        const predictionCategory = document.getElementById("prediction-category");
        const predictionIndicator = document.getElementById("prediction-indicator");

        predictionCategory.textContent = prediction; // Display the prediction (Moderate, High, Low)

        // Add styles or classes based on the prediction
        predictionIndicator.classList.remove('poor-risk', 'moderate-risk', 'high-risk'); // Remove any previous status classes
        if (prediction === "Low") {
            predictionIndicator.classList.add('poor-risk');
        } else if (prediction === "Moderate") {
            predictionIndicator.classList.add('moderate-risk');
        } else if (prediction === "High") {
            predictionIndicator.classList.add('high-risk');
        }
    }
};

// --- ADD THIS FUNCTION ---
function displayRecommendations(meanPh, modeNitrogen, modePhosphorus, modePotassium) {
    const phData = analyzePh(meanPh);
    const nData = analyzeNitrogen(modeNitrogen);
    const pData = analyzePhosphorus(modePhosphorus);
    const kData = analyzePotassium(modePotassium);

    function applyToDOM(prefix, data) {
        document.getElementById(`${prefix}-status`).textContent = data.status || "--";
        document.getElementById(`${prefix}-reference`).textContent = data.reference || "--";
        document.getElementById(`${prefix}-message`).textContent = data.message || "--";
        document.getElementById(`${prefix}-recommendation`).textContent = data.recommendation || "--";
        document.getElementById(`${prefix}-action`).textContent = data.action || "--";
        document.getElementById(`${prefix}-symptoms`).textContent = data.symptoms || "--";
        document.getElementById(`${prefix}-special`).textContent = data.special_case || "--";
    }

    applyToDOM("ph", phData);
    applyToDOM("nitrogen", nData);
    applyToDOM("phosphorus", pData);
    applyToDOM("potassium", kData);
}


// --- pH Analysis ---
function analyzePh(meanPh) {
    if (meanPh < 4.5) {
        return {
            status: "Ultra Acidic",
            reference: "pH < 4.5",
            message: "Soil is extremely acidic. Crop growth is highly limited.",
            recommendation: "Apply Agricultural Lime, Wood Ash, and Organic Matter.",
            action: "Use Calcium Nitrate or Potassium Nitrate.",
            symptoms: "Severe stunting, yellowing leaves, poor yield.",
            special_case: "May require soil replacement in extreme cases."
        };
    } else if (meanPh >= 4.5 && meanPh <= 5.0) {
        return {
            status: "Strongly Acidic",
            reference: "4.5 ≤ pH ≤ 5.0",
            message: "Soil acidity is strongly affecting nutrient availability.",
            recommendation: "Apply Dolomitic Lime, Compost.",
            action: "Add Calcium Nitrate and maintain organic cover.",
            symptoms: "Leaf burn, phosphorus deficiency signs.",
            special_case: "Check for aluminum toxicity."
        };
    } else if (meanPh > 5.0 && meanPh <= 5.5) {
        return {
            status: "Moderately Acidic",
            reference: "5.0 < pH ≤ 5.5",
            message: "Acidity present, but some crops may tolerate it.",
            recommendation: "Apply Lime in small amounts and Compost.",
            action: "Use Balanced NPK Fertilizers.",
            symptoms: "Purpling of leaves, reduced root growth.",
            special_case: "Suitable for acid-tolerant crops like rice."
        };
    } else if (meanPh > 5.5 && meanPh <= 6.0) {
        return {
            status: "Slightly Acidic",
            reference: "5.5 < pH ≤ 6.0",
            message: "Soil is slightly acidic, ideal for many crops.",
            recommendation: "Add minimal Lime and Compost.",
            action: "Use Super Phosphate for phosphorus supply.",
            symptoms: "Mild chlorosis in sensitive crops.",
            special_case: "Good for root crops like carrots and potatoes."
        };
    } else if (meanPh > 6.0 && meanPh <= 6.5) {
        return {
            status: "Neutral (Optimal Zone)",
            reference: "6.0 < pH ≤ 6.5",
            message: "Ideal pH for most nutrient availability.",
            recommendation: "Maintain with Compost and Balanced Fertilizers.",
            action: "Routine monitoring and organic mulching.",
            symptoms: "None – ideal soil condition.",
            special_case: "Best for vegetables, legumes, and cereals."
        };
    } else if (meanPh > 6.5 && meanPh <= 7.5) {
        return {
            status: "Slightly Alkaline",
            reference: "6.5 < pH ≤ 7.5",
            message: "Slight alkalinity may limit iron and phosphorus uptake.",
            recommendation: "Apply Elemental Sulfur and Organic Matter.",
            action: "Use Iron Sulfate to combat chlorosis.",
            symptoms: "Iron chlorosis (yellowing between leaf veins).",
            special_case: "May affect blueberry, potato, and other acid-loving crops."
        };
    } else if (meanPh > 7.5 && meanPh <= 8.5) {
        return {
            status: "Moderately Alkaline",
            reference: "7.5 < pH ≤ 8.5",
            message: "Moderate alkalinity significantly affects nutrient solubility.",
            recommendation: "Use Elemental Sulfur, Gypsum.",
            action: "Use Acidic Fertilizers like Ammonium Sulfate.",
            symptoms: "Nutrient deficiencies, especially Fe, Zn, and Mn.",
            special_case: "Avoid lime-based fertilizers."
        };
    } else {
        return {
            status: "Strongly Alkaline",
            reference: "pH > 8.5",
            message: "Soil is highly alkaline and unsuitable for most crops.",
            recommendation: "Apply Elemental Sulfur and Gypsum.",
            action: "Use Acid-forming Fertilizers and Organic Mulch.",
            symptoms: "Severe nutrient lockout, poor growth.",
            special_case: "Consider raised beds with imported topsoil."
        };
    }
}

// --- Nitrogen Analysis ---
function analyzeNitrogen(modeNitrogen) {
    const OM = (parseFloat(modeNitrogen) * 100) / 2000;

    if (OM < 1.0) {
        return {
            status: "Critically Low",
            reference: `OM% = ${OM.toFixed(2)}%`,
            message: "Soil organic matter is extremely low.",
            recommendation: "Immediate supplementation needed.",
            action: "Use Urea, Ammonium Nitrate, or Ammonium Sulfate. Add composted manure and plant cover crops.",
            symptoms: "Pale green or yellow leaves, stunted growth.",
            special_case: "Apply green manure like leguminous cover crops."
        };
    } else if (OM >= 1.0 && OM < 2.0) {
        return {
            status: "Low",
            reference: `OM% = ${OM.toFixed(2)}%`,
            message: "Nitrogen levels are insufficient.",
            recommendation: "Use Urea, Ammonium Nitrate, or Calcium Nitrate.",
            action: "Supplement with compost, blood meal, and legumes.",
            symptoms: "Reduced tillering and early maturity.",
            special_case: "Frequent split application improves uptake."
        };
    } else if (OM > 2.0 && OM <= 4.0) {
        return {
            status: "Moderate",
            reference: `OM% = ${OM.toFixed(2)}%`,
            message: "Organic matter content is acceptable.",
            recommendation: "Apply balanced fertilizers (e.g. 14-14-14).",
            action: "Maintain with mulch and compost.",
            symptoms: "Healthy growth unless other nutrients are limiting.",
            special_case: "Rotate with legumes to maintain nitrogen."
        };
    } else {
        return {
            status: "High",
            reference: `OM% = ${OM.toFixed(2)}%`,
            message: "Soil is rich in organic matter.",
            recommendation: "Reduce nitrogen fertilizer use.",
            action: "Apply phosphorus and potassium fertilizers.",
            symptoms: "Dark green foliage, excessive vegetative growth.",
            special_case: "Use high N-demand crops like maize."
        };
    }
}

// --- Phosphorus Analysis ---
function analyzePhosphorus(modePhosphorus) {
    if (modePhosphorus <= 10) {
        return {
            status: "Low",
            reference: `P = ${modePhosphorus} ppm`,
            message: "Phosphorus is deficient for optimal plant growth.",
            recommendation: "Apply Rock Phosphate or Bone Meal.",
            action: "Add compost and improve organic content.",
            symptoms: "Purplish discoloration of leaves, poor root development.",
            special_case: "Cold soils further reduce availability."
        };
    } else if (modePhosphorus > 10 && modePhosphorus <= 20) {
        return {
            status: "Moderate",
            reference: `P = ${modePhosphorus} ppm`,
            message: "Phosphorus is moderately sufficient.",
            recommendation: "Maintain with compost and phosphorus-accumulating crops.",
            action: "Use cover crops like legumes to cycle P.",
            symptoms: "Slight stunting in high-demand crops.",
            special_case: "Monitor closely during early growth stages."
        };
    } else if (modePhosphorus > 20 && modePhosphorus <= 40) {
        return {
            status: "Optimal",
            reference: `P = ${modePhosphorus} ppm`,
            message: "Phosphorus is in a healthy range.",
            recommendation: "Use compost to sustain levels.",
            action: "No immediate phosphorus fertilization required.",
            symptoms: "None expected.",
            special_case: "Best for fruiting and flowering crops."
        };
    } else {
        return {
            status: "High",
            reference: `P = ${modePhosphorus} ppm`,
            message: "Excess phosphorus may lead to nutrient imbalance.",
            recommendation: "Avoid phosphorus fertilizers.",
            action: "Use crops that utilize excess P, like corn.",
            symptoms: "Possible zinc deficiency symptoms.",
            special_case: "Phosphorus runoff may affect water bodies."
        };
    }
}

// --- Potassium Analysis ---
function analyzePotassium(modePotassium) {
    if (modePotassium < 100) {
        return {
            status: "Low",
            reference: `K = ${modePotassium} ppm`,
            message: "Potassium is below optimal levels.",
            recommendation: "Apply Potassium Fertilizers.",
            action: "Use Muriate of Potash (KCl) or Sulfate of Potash (SOP).",
            symptoms: "Leaf scorch, poor drought resistance.",
            special_case: "Important for root and tuber crops."
        };
    } else if (modePotassium >= 100 && modePotassium <= 200) {
        return {
            status: "Moderate",
            reference: `K = ${modePotassium} ppm`,
            message: "Potassium is moderately sufficient.",
            recommendation: "Monitor and maintain with compost.",
            action: "Supplement with K if deficiency symptoms appear.",
            symptoms: "Mild leaf edge browning in sensitive crops.",
            special_case: "Watch for leaching in sandy soils."
        };
    } else {
        return {
            status: "High",
            reference: `K = ${modePotassium} ppm`,
            message: "Potassium levels are high.",
            recommendation: "Avoid potassium fertilization.",
            action: "Encourage uptake with high K-demand crops.",
            symptoms: "May induce magnesium deficiency.",
            special_case: "Can lock out calcium in some soils."
        };
    }
}

function updateRecommendation(data, analysisType, phData, nData, pData, kData) {
    const item = document.getElementById(`${analysisType}-analysis`);
    if (!item) return;

    const fields = ['status', 'reference', 'message', 'recommendation', 'action', 'symptoms', 'special'];

    // Update the fields with the corresponding data
    fields.forEach(field => {
        const el = document.getElementById(`${analysisType}-${field}`);
        if (el && data[field]) {
            el.textContent = data[field];
        }
    });

    // Clear previous status class
    item.classList.remove('low', 'moderate', 'high', 'optimal');

    // Map the status to the corresponding CSS class
    const statusClassMap = {
        'Low': 'low',
        'Moderate': 'moderate',
        'High': 'high',
        'Optimal': 'optimal'
    };

    const cssClass = statusClassMap[data.status];
    if (cssClass) {
        item.classList.add(cssClass);
        console.log(`${analysisType} status class applied: ${cssClass}`);
    }

    // Add dynamic status classes for the different analysis types (ph, nitrogen, phosphorus, potassium)
    if (phData && phData.status) {
        console.log("phData.status:", phData.status);
        document.getElementById("ph-analysis").classList.add(phData.status.toLowerCase());
    }
    if (nData && nData.status) {
        console.log("nData.status:", nData.status);
        document.getElementById("nitrogen-analysis").classList.add(nData.status.toLowerCase());
    }
    if (pData && pData.status) {
        console.log("pData.status:", pData.status);
        document.getElementById("phosphorus-analysis").classList.add(pData.status.toLowerCase());
    }
    if (kData && kData.status) {
        console.log("kData.status:", kData.status);
        document.getElementById("potassium-analysis").classList.add(kData.status.toLowerCase());
    }
}

// Example usage:

// Sample data for pH, Nitrogen, Phosphorus, and Potassium
const phData = { status: 'Low', reference: 'pH Reference', message: 'Soil pH is low' };
const nData = { status: 'Moderate', reference: 'N Reference', message: 'Nitrogen is moderate' };
const pData = { status: 'High', reference: 'P Reference', message: 'Phosphorus is abundant' };
const kData = { status: 'Optimal', reference: 'K Reference', message: 'Potassium levels are optimal' };


// Calling the updateRecommendation function
updateRecommendation('ph', phData, nData, pData, kData);


const updateEvaluateButton = () => {
    const selectedItems = document.querySelectorAll(".file-item.selected");
    evaluateButton.disabled = selectedItems.length !== 2;
};

// Initialize Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loginButton?.addEventListener("click", () => auth.currentUser ? logout() : openAuthModal());
    googleLoginButton?.addEventListener("click", loginWithGoogle);
    retrieveButton?.addEventListener("click", openPopup);
    closeBtn?.addEventListener("click", closePopup);
    deleteButton?.addEventListener("click", () => console.log("Delete clicked (future implementation)"));
});
