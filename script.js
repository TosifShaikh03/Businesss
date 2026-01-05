// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function () {
    // Check if user is already logged in
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            showApp();
            loadUserData();
        } else {
            // User is signed out
            showAuth();
        }
    });

    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
});

// Authentication Functions
function showLoginForm() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('signupForm').classList.remove('active');
    document.querySelectorAll('.auth-tab')[0].classList.add('active');
    document.querySelectorAll('.auth-tab')[1].classList.remove('active');
    clearAuthError();
}

function showSignupForm() {
    document.getElementById('signupForm').classList.add('active');
    document.getElementById('loginForm').classList.remove('active');
    document.querySelectorAll('.auth-tab')[1].classList.add('active');
    document.querySelectorAll('.auth-tab')[0].classList.remove('active');
    clearAuthError();
}

function clearAuthError() {
    const errorDiv = document.getElementById('authError');
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
    setTimeout(clearAuthError, 5000);
}

async function loginWithEmail(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = event.target.querySelector('.auth-btn');

    if (!email || !password) {
        showAuthError('Please enter both email and password');
        return;
    }

    try {
        // Show loading state
        btn.classList.add('loading');
        btn.querySelector('.btn-text').style.opacity = '0';
        btn.querySelector('.btn-loader').style.display = 'block';

        await auth.signInWithEmailAndPassword(email, password);

        // Clear form
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';

    } catch (error) {
        console.error('Login error:', error);

        let errorMessage = 'Login failed. ';
        switch (error.code) {
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/user-disabled':
                errorMessage += 'This account has been disabled.';
                break;
            case 'auth/user-not-found':
                errorMessage += 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage += 'Incorrect password.';
                break;
            default:
                errorMessage += error.message;
        }

        showAuthError(errorMessage);
    } finally {
        // Hide loading state
        btn.classList.remove('loading');
        btn.querySelector('.btn-text').style.opacity = '1';
        btn.querySelector('.btn-loader').style.display = 'none';
    }
}

async function signupWithEmail(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const btn = event.target.querySelector('.auth-btn');

    // Validation
    if (!name || !email || !password || !confirmPassword) {
        showAuthError('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        showAuthError('Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showAuthError('Passwords do not match');
        return;
    }

    try {
        // Show loading state
        btn.classList.add('loading');
        btn.querySelector('.btn-text').style.opacity = '0';
        btn.querySelector('.btn-loader').style.display = 'block';

        // Create user with email and password
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Add user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Clear form
        document.getElementById('signupName').value = '';
        document.getElementById('signupEmail').value = '';
        document.getElementById('signupPassword').value = '';
        document.getElementById('confirmPassword').value = '';

        showToast('Account created successfully!', 'success');

    } catch (error) {
        console.error('Signup error:', error);

        let errorMessage = 'Signup failed. ';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage += 'Email already in use.';
                break;
            case 'auth/invalid-email':
                errorMessage += 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage += 'Password is too weak.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage += 'Email/password accounts are not enabled.';
                break;
            default:
                errorMessage += error.message;
        }

        showAuthError(errorMessage);
    } finally {
        // Hide loading state
        btn.classList.remove('loading');
        btn.querySelector('.btn-text').style.opacity = '1';
        btn.querySelector('.btn-loader').style.display = 'none';
    }
}

async function logoutUser() {
    try {
        await auth.signOut();
        showToast('Logged out successfully', 'info');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// UI Functions
function showAuth() {
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    // Update user info
    const userName = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('userName').textContent = userName;
    document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();

    // Set current date
    const now = new Date();
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-IN', options);
}

// Data Loading Functions
function loadUserData() {
    if (!currentUser) return;

    // Load collections
    db.collection('users').doc(currentUser.uid).collection('collections')
        .orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
            collections = [];
            snapshot.forEach(doc => {
                collections.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderCollections();
            updateDashboard();
            updateCharts();
        });

    // Load EMIs
    db.collection('users').doc(currentUser.uid).collection('emis')
        .onSnapshot((snapshot) => {
            emis = [];
            snapshot.forEach(doc => {
                emis.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderEMIs();
            updateDashboard();
            updateCharts();
        });
}

// Collection Functions
function showCollectionForm() {
    document.getElementById('collectionForm').style.display = 'block';
    document.getElementById('collectionDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('collectionAmount').focus();
}

function hideCollectionForm() {
    document.getElementById('collectionForm').style.display = 'none';
    document.getElementById('addCollectionForm').reset();
}

async function addCollection(event) {
    event.preventDefault();
    
    if (!currentUser) return;
    
    const date = document.getElementById('collectionDate').value;
    const amount = parseFloat(document.getElementById('collectionAmount').value);
    // REMOVED: const source = document.getElementById('collectionSource').value.trim();
    // REMOVED: const paymentMode = document.getElementById('collectionPaymentMode').value;
    
    // Updated validation without source and paymentMode
    if (!date || isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid date and amount', 'error');
        return;
    }
    
    try {
        await db.collection('users').doc(currentUser.uid).collection('collections').add({
            date: date,
            amount: amount,
            // REMOVED: source: source,
            // REMOVED: paymentMode: paymentMode,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            month: new Date(date).getMonth() + 1,
            year: new Date(date).getFullYear()
        });
        
        hideCollectionForm();
        showToast('Collection added successfully', 'success');
        
    } catch (error) {
        console.error('Add collection error:', error);
        showToast('Failed to add collection', 'error');
    }
}

function renderCollections() {
    const container = document.getElementById('collectionsList');
    
    if (collections.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="3" class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <p>No collections yet</p>
                </td>
            </tr>
        `;
        updateCollectionSummary();
        return;
    }
    
    let totalAmount = 0;
    const rows = collections.map(collection => {
        totalAmount += collection.amount;
        
        const date = new Date(collection.date);
        const formattedDate = date.toLocaleDateString('en-IN');
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td>₹${collection.amount.toLocaleString('en-IN')}</td>
                <!-- REMOVED: Source and Payment Mode columns -->
                <td class="table-actions">
                    <button class="btn-action delete" onclick="deleteCollection('${collection.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = rows;
    updateCollectionSummary(totalAmount);
}

async function deleteCollection(id) {
    if (!currentUser || !confirm('Are you sure you want to delete this collection?')) {
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).collection('collections').doc(id).delete();
        showToast('Collection deleted', 'info');
    } catch (error) {
        console.error('Delete collection error:', error);
        showToast('Failed to delete collection', 'error');
    }
}

function updateCollectionSummary(totalAmount = 0) {
    const profit = totalAmount * 0.3;

    document.getElementById('collectionsTotal').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
    document.getElementById('collectionsProfit').textContent = `₹${profit.toLocaleString('en-IN')}`;
}

// EMI Functions
function showEMIForm() {
    document.getElementById('emiForm').style.display = 'block';
    document.getElementById('emiStartDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('emiName').focus();
}

function hideEMIForm() {
    document.getElementById('emiForm').style.display = 'none';
    document.getElementById('addEMIForm').reset();
}

async function addEMI(event) {
    event.preventDefault();

    if (!currentUser) return;

    const name = document.getElementById('emiName').value.trim();
    const amount = parseFloat(document.getElementById('emiAmount').value);
    const dueDate = parseInt(document.getElementById('emiDueDate').value);
    const startDate = document.getElementById('emiStartDate').value;
    const totalMonths = parseInt(document.getElementById('emiTotalMonths').value);

    if (!name || isNaN(amount) || amount <= 0 || isNaN(dueDate) || dueDate < 1 || dueDate > 31 || !startDate || isNaN(totalMonths) || totalMonths <= 0) {
        showToast('Please fill all fields correctly', 'error');
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).collection('emis').add({
            name: name,
            amount: amount,
            dueDate: dueDate,
            startDate: startDate,
            totalMonths: totalMonths,
            paidMonths: 0,
            isPaidThisMonth: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        hideEMIForm();
        showToast('EMI added successfully', 'success');

    } catch (error) {
        console.error('Add EMI error:', error);
        showToast('Failed to add EMI', 'error');
    }
}

function renderEMIs() {
    const container = document.getElementById('emiList');

    if (emis.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">
                    <i class="fas fa-credit-card"></i>
                    <p>No EMI records yet</p>
                </td>
            </tr>
        `;
        updateEMISummary();
        return;
    }

    let totalEMI = 0;
    let completedEMI = 0;
    let pendingEMI = 0;

    const rows = emis.map(emi => {
        if (emi.isPaidThisMonth) {
            completedEMI++;
        } else {
            pendingEMI++;
            totalEMI += emi.amount;
        }

        const statusClass = emi.isPaidThisMonth ? 'status-paid' : 'status-pending';
        const statusText = emi.isPaidThisMonth ? 'Paid' : 'Pending';

        return `
            <tr>
                <td>${emi.name}</td>
                <td>₹${emi.amount.toLocaleString('en-IN')}</td>
                <td>${emi.dueDate}${getDaySuffix(emi.dueDate)} of month</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td class="table-actions">
                    ${!emi.isPaidThisMonth ? `
                    <button class="btn-action paid" onclick="showEMIPaymentModal('${emi.id}')">
                        <i class="fas fa-check"></i> Mark Paid
                    </button>
                    ` : ''}
                    <button class="btn-action delete" onclick="deleteEMI('${emi.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    container.innerHTML = rows;
    updateEMISummary(totalEMI, completedEMI, pendingEMI);
}

async function showEMIPaymentModal(emiId) {
    const emi = emis.find(e => e.id === emiId);
    if (!emi) return;

    currentEMIToUpdate = emiId;

    document.getElementById('modalEmiDetails').innerHTML = `
        <strong>${emi.name}</strong><br>
        Amount: ₹${emi.amount.toLocaleString('en-IN')}<br>
        Due Date: ${emi.dueDate}${getDaySuffix(emi.dueDate)} of month
    `;

    document.getElementById('emiModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('emiModal').style.display = 'none';
    currentEMIToUpdate = null;
}

async function confirmEMIPayment() {
    if (!currentUser || !currentEMIToUpdate) return;

    try {
        await db.collection('users').doc(currentUser.uid).collection('emis').doc(currentEMIToUpdate).update({
            isPaidThisMonth: true,
            paidDate: new Date().toISOString(),
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        });

        closeModal();
        showToast('EMI marked as paid', 'success');

    } catch (error) {
        console.error('Update EMI error:', error);
        showToast('Failed to update EMI status', 'error');
    }
}

async function deleteEMI(id) {
    if (!currentUser || !confirm('Are you sure you want to delete this EMI?')) {
        return;
    }

    try {
        await db.collection('users').doc(currentUser.uid).collection('emis').doc(id).delete();
        showToast('EMI deleted', 'info');
    } catch (error) {
        console.error('Delete EMI error:', error);
        showToast('Failed to delete EMI', 'error');
    }
}

function updateEMISummary(totalEMI = 0, completed = 0, pending = 0) {
    document.getElementById('emiTotal').textContent = `₹${totalEMI.toLocaleString('en-IN')}`;
    document.getElementById('emiCompleted').textContent = completed;
    document.getElementById('emiPending').textContent = pending;
}

// Dashboard Functions
function updateDashboard() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Calculate collections for current month
    const monthlyCollections = collections.filter(c => {
        const date = new Date(c.date);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
    });

    const totalCollection = monthlyCollections.reduce((sum, c) => sum + c.amount, 0);
    const monthlyProfit = totalCollection * 0.3;

    // Calculate pending EMI
    const pendingEMIs = emis.filter(e => !e.isPaidThisMonth);
    const totalPendingEMI = pendingEMIs.reduce((sum, e) => sum + e.amount, 0);

    // Calculate net balance
    const netBalance = totalCollection - totalPendingEMI;

    // Update dashboard
    document.getElementById('totalCollection').textContent = `₹${totalCollection.toLocaleString('en-IN')}`;
    document.getElementById('monthlyProfit').textContent = `₹${monthlyProfit.toLocaleString('en-IN')}`;
    document.getElementById('pendingEmi').textContent = `₹${totalPendingEMI.toLocaleString('en-IN')}`;
    document.getElementById('netBalance').textContent = `₹${netBalance.toLocaleString('en-IN')}`;
}

// Chart Functions
function updateCharts() {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Calculate collections for current month
    const monthlyCollections = collections.filter(c => {
        const date = new Date(c.date);
        return date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
    });

    const totalCollection = monthlyCollections.reduce((sum, c) => sum + c.amount, 0);
    const pendingEMIs = emis.filter(e => !e.isPaidThisMonth);
    const totalPendingEMI = pendingEMIs.reduce((sum, e) => sum + e.amount, 0);

    // Collections vs EMI Chart
    if (!collectionChart) {
        const ctx1 = document.getElementById('collectionEmiChart').getContext('2d');
        collectionChart = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: ['Collections', 'EMI'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [totalCollection, totalPendingEMI],
                    backgroundColor: [
                        'rgba(102, 126, 234, 0.7)',
                        'rgba(245, 158, 11, 0.7)'
                    ],
                    borderColor: [
                        'rgb(102, 126, 234)',
                        'rgb(245, 158, 11)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function (value) {
                                return '₹' + value.toLocaleString('en-IN');
                            }
                        }
                    }
                }
            }
        });
    } else {
        collectionChart.data.datasets[0].data = [totalCollection, totalPendingEMI];
        collectionChart.update();
    }

    // Profit Chart
    const profit = totalCollection * 0.3;
    const cost = totalCollection * 0.7;

    if (!profitChart) {
        const ctx2 = document.getElementById('profitChart').getContext('2d');
        profitChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: ['Profit (30%)', 'Cost (70%)'],
                datasets: [{
                    data: [profit, cost],
                    backgroundColor: [
                        'rgba(16, 185, 129, 0.7)',
                        'rgba(59, 130, 246, 0.7)'
                    ],
                    borderColor: [
                        'rgb(16, 185, 129)',
                        'rgb(59, 130, 246)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } else {
        profitChart.data.datasets[0].data = [profit, cost];
        profitChart.update();
    }
}

// Helper Functions
function getDaySuffix(day) {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
    }
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icon = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    toast.innerHTML = `
        <i class="fas ${icon}"></i>
        <div class="toast-content">
            <p>${message}</p>
            <small>${time}</small>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 5000);
}

function printReport() {
    const printContent = `
        <html>
        <head>
            <title>Business Manager Report</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #333; }
                .report-section { margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f4f4f4; }
            </style>
        </head>
        <body>
            <h1>Business Manager Report</h1>
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            
            <div class="report-section">
                <h2>Collections (${collections.length} entries)</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Amount</th>
                            <!-- REMOVED: <th>Source</th> -->
                            <!-- REMOVED: <th>Payment Mode</th> -->
                        </tr>
                    </thead>
                    <tbody>
                        ${collections.map(c => `
                            <tr>
                                <td>${new Date(c.date).toLocaleDateString()}</td>
                                <td>₹${c.amount.toLocaleString('en-IN')}</td>
                                <!-- REMOVED: Source and Payment Mode data -->
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Rest of your print report remains -->
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}