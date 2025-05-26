import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import {
    getStorage,
    ref,
    getDownloadURL,
    listAll
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyBjFcF9fqGTXWODNo6yLGY3CjMB-F9E1Ag",
    authDomain: "terrasense-v1.firebaseapp.com",
    projectId: "terrasense-v1",
    storageBucket: "terrasense-v1.appspot.com",
    messagingSenderId: "862515123214",
    appId: "1:862515123214:web:74ae932c1ed90f7681585f",
    measurementId: "G-HHRKDNBQ9Y"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

const loginButton = document.getElementById('loginButton');
const googleLoginButton = document.getElementById('googleLoginButton');
const authModal = document.getElementById('auth-modal');
const userEmailDisplay = document.getElementById('user-email-display');
const loginText = document.getElementById('loginText');

loginButton.addEventListener('click', () => {
    authModal.style.display = 'block';
});

function closeAuthModal() {
    authModal.style.display = 'none';
}
window.closeAuthModal = closeAuthModal;

googleLoginButton.addEventListener('click', () => {
    console.log("Google login clicked");
    
    // Disable the button to prevent multiple clicks
    googleLoginButton.disabled = true;

    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            console.log("Google login successful:", user.email);
            userEmailDisplay.innerText = user.email;
            loginText.innerText = "Logout";
            closeAuthModal();
        })
        .catch((error) => {
            console.error("Google login failed:", error);
            alert("Error logging in with Google. Please try again.");

            // Check for specific error code
            if (error.code === 'auth/cancelled-popup-request') {
                alert("Login process was canceled. Please try again.");
            }

            // Re-enable the button
            googleLoginButton.disabled = false;
        });
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginText.textContent = 'Logout';
        userEmailDisplay.textContent = user.email;
        userEmailDisplay.style.display = 'block';
        loginButton.onclick = () => signOut(auth);
        fetchCSVFiles(user.email);
    } else {
        // User is logged out
        loginText.textContent = 'Login';
        userEmailDisplay.style.display = 'none';
        
        // Clear inputs and reset UI elements
        clearInputs(); // Call the function to clear inputs
        loginButton.onclick = () => {
            authModal.style.display = 'block';
        };
    }
});

function clearInputs() {
    userEmailDisplay.innerText = '';

    const predictionCategory = document.getElementById('prediction-category');
    const predictionIndicator = document.getElementById('prediction-indicator');
    const predictionDescription = document.getElementById('prediction-description').querySelector('p');

    predictionCategory.textContent = '--';
    predictionIndicator.className = 'status-indicator';
    predictionDescription.textContent = '--'; 

    const phMessageElement = document.getElementById('ph-message');
    if(phMessageElement) phMessageElement.innerText = '--';
    
    const nitrogenMessageElement = document.getElementById('nitrogen-message');
    if(nitrogenMessageElement) nitrogenMessageElement.innerText = '--';
    
    const phosphorusMessageElement = document.getElementById('phosphorus-message');
    if(phosphorusMessageElement) phosphorusMessageElement.innerText = '--';
    
    const potassiumMessageElement = document.getElementById('potassium-message');
    if(potassiumMessageElement) potassiumMessageElement.innerText = '--';

    const tableBody = document.querySelector('#csvTable tbody');
    if (tableBody) {
        tableBody.innerHTML = ''; 
    }

    if (soilLineChart) {
        soilLineChart.destroy(); 
        soilLineChart = null;    
    }
}

function parseCSV(content) {
    const rows = content.trim().split('\n').map(row => row.split(','));
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
            obj[header.trim()] = row[i]?.trim();
        });
        return obj;
    });
    return data;
}

function displayMergedData(d0Data, d1Data) {
    const tableBody = document.querySelector('#csvTable tbody');
    tableBody.innerHTML = '';

    for (let i = 0; i < d0Data.length; i++) {
        const d0 = d0Data[i];
        const d1 = d1Data[i] || {};

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${d0.Date || ''}</td>
            <td>${d0.Time || ''}</td>
            <td>${d0.Nitrogen || ''}</td>
            <td>${d0.Phosphorus || ''}</td>
            <td>${d0.Potassium || ''}</td>
            <td>${d1.Status || ''}</td>
            <td>${d1.Soil_pH || ''}</td>
        `;
        tableBody.appendChild(row);
    }
}

let soilLineChart = null;

function drawLineChart(dataArray) {
    console.log("Incoming data to drawLineChart:", dataArray);

    const labels = dataArray.map((row, i) => row.Time || `Sample ${i + 1}`);
    const nitrogen = dataArray.map(row => parseFloat(row.Nitrogen) || 0);
    const phosphorus = dataArray.map(row => parseFloat(row.Phosphorus) || 0);
    const potassium = dataArray.map(row => parseFloat(row.Potassium) || 0);
    const ph = dataArray.map(row => parseFloat(row.Soil_pH) || 0);

    const ctx = document.getElementById('soilLineChart').getContext('2d');

    if (soilLineChart) {
        soilLineChart.destroy();
    }

    soilLineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Nitrogen',
                    data: nitrogen,
                    borderColor: 'red',
                    backgroundColor: 'red',
                    fill: false
                },
                {
                    label: 'Phosphorus',
                    data: phosphorus,
                    borderColor: 'blue',
                    backgroundColor: 'blue',
                    fill: false
                },
                {
                    label: 'Potassium',
                    data: potassium,
                    borderColor: 'green',
                    backgroundColor: 'green',
                    fill: false
                },
                {
                    label: 'Soil pH',
                    data: ph,
                    borderColor: 'purple',
                    backgroundColor: 'purple',
                    fill: false,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            stacked: false,
            plugins: {
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {
                            enabled: true
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x'
                    }
                },
                legend: {
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Soil Nutrient'
                }
            },
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 45,
                        minRotation: 45
                    },
                    title: {
                        display: true,
                        text: 'Time (HH:mm)'
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: { display: true, text: 'Nutrient Level' },
                    min: 0,
                    max: 200,
                    ticks: { stepSize: 10 }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: { display: true, text: 'pH Level' },
                    grid: { drawOnChartArea: false },
                    min: 0,
                    max: 14
                }
            }
        }
    });
}

async function fetchCSVFiles(userEmail) {
    const storage = getStorage();
    
    // Fetch available dates from Firebase
    const availableDates = await fetchAvailableDates(userEmail);
    const latestDate = availableDates.length > 0 ? availableDates[0] : null; // Assuming dates are sorted with the latest first

    // If no dates are available, handle the case
    if (!latestDate) {
        console.error("No available dates found.");
        return;
    }

    // Use the latest date if no specific date is provided
    const dateStr = latestDate; // Format: "MM-DD-YYYY"

    const farmMatch = userEmail.match(/Farm(\d+)/i);
    if (!farmMatch) return;

    const farmNumber = farmMatch[1];
    const fileD0 = `csv_uploads/Farm${farmNumber}_${dateStr}_D0_soil_log.csv`;
    const fileD1 = `csv_uploads/Farm${farmNumber}_${dateStr}_D1_soil_log.csv`;

    try {
        const urlD0 = await getDownloadURL(ref(storage, fileD0));
        const urlD1 = await getDownloadURL(ref(storage, fileD1));

        const [resD0, resD1] = await Promise.all([
            fetch(urlD0).then(res => res.text()),
            fetch(urlD1).then(res => res.text())
        ]);

        const d0Data = parseCSV(resD0);
        const d1Data = parseCSV(resD1);

        displayMergedData(d0Data, d1Data);
        sendCSVDataToBackend(d0Data, d1Data);

        const mergedData = d0Data.map((d0, i) => ({
            Time: d0.Time || `Sample ${i + 1}`,
            Nitrogen: d0.Nitrogen || "0",
            Phosphorus: d0.Phosphorus || "0",
            Potassium: d0.Potassium || "0",
            Soil_pH: d1Data[i]?.Soil_pH || "0"
        }));

        drawLineChart(mergedData);

    } catch (error) {
        console.error("Error fetching CSV files:", error);

        let message = "Failed to load data: " + error.message;
        if (error.code === 'storage/object-not-found') {
            message = "There's no upload yet";
        }

        const tableBody = document.querySelector('#csvTable tbody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7">${message}</td></tr>`;
        }
    }
}

// Function to fetch available dates from Firebase
async function fetchAvailableDates(userEmail) {
    const storage = getStorage();
    const farmMatch = userEmail.match(/Farm(\d+)/i);
    if (!farmMatch) return [];

    const farmNumber = farmMatch[1];
    const listRef = ref(storage, `csv_uploads/`);

    try {
        const res = await listAll(listRef);
        const dates = res.items
            .map(item => item.name)
            .filter(name => name.startsWith(`Farm${farmNumber}`))
            .map(name => {
                const dateMatch = name.match(/_(\d{2}-\d{2}-\d{4})_/);
                return dateMatch ? dateMatch[1] : null;
            })
            .filter(date => date !== null)
            .sort((a, b) => new Date(b) - new Date(a)); // Sort dates in descending order

        return dates; // Return the sorted list of available dates
    } catch (error) {
        console.error("Error fetching available dates:", error);
        return [];
    }
}

async function sendCSVDataToBackend(d0Data, d1Data) {
    try {
        if (!d0Data.length || !d1Data.length) {
        console.error("No data to send to backend");
        return;
        }
        const backendUrl = 'https://terra-sense-production.up.railway.app';
        const response = await fetch(`${backendUrl}/evaluate`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ d0Data, d1Data })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.predictions && result.predictions.length > 0) {
            const prediction = result.predictions[0]; // Still just showing first prediction

            const predictionCategory = document.getElementById('prediction-category');
            const predictionIndicator = document.getElementById('prediction-indicator');
            const predictionDescription = document.getElementById('prediction-description').querySelector('p');

            predictionCategory.textContent = prediction.result; // Update with prediction result
            predictionDescription.textContent = prediction.description; // Update with prediction description

            predictionIndicator.className = 'status-indicator';
            if (prediction.result.toLowerCase().includes('high')) {
                predictionIndicator.classList.add('high-status');
            } else if (prediction.result.toLowerCase().includes('moderate')) {
                predictionIndicator.classList.add('moderate-status');
            } else if (prediction.result.toLowerCase().includes('poor')) {
                predictionIndicator.classList.add('low-status');
            } else {
                predictionIndicator.classList.add('default-status');
            }
        } else {
            const predictionCategory = document.getElementById('prediction-category');
            const predictionIndicator = document.getElementById('prediction-indicator');
            const predictionDescription = document.getElementById('prediction-description').querySelector('p');

            predictionCategory.textContent = "Prediction error or no data";
            predictionDescription.textContent = ""; // Clear description
            predictionIndicator.className = 'status-indicator default-status';
        }

        // Handle overall recommendation (updated here)
        if (result.overall_recommendation) {
            const rec = result.overall_recommendation;

            const phMessageElement = document.getElementById('ph-message');
            if (phMessageElement) phMessageElement.innerText = extractMessage(rec.ph);

            const nitrogenMessageElement = document.getElementById('nitrogen-message');
            if (nitrogenMessageElement) nitrogenMessageElement.innerText = extractMessage(rec.nitrogen);

            const phosphorusMessageElement = document.getElementById('phosphorus-message');
            if (phosphorusMessageElement) phosphorusMessageElement.innerText = extractMessage(rec.phosphorus);

            const potassiumMessageElement = document.getElementById('potassium-message');
            if (potassiumMessageElement) potassiumMessageElement.innerText = extractMessage(rec.potassium);
        }

    } catch (error) {
        console.error("Error fetching or displaying recommendations:", error);
        alert(`Error sending data to backend: ${error.message}`);
    }
}

function extractMessage(recommendationText) {
    return recommendationText || "--";
}



