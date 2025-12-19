// Configurable API base URL - change this to your deployed backend URL for online use
const API_BASE = ''; // Leave empty for relative URLs (same server), or set to 'https://your-vercel-url.vercel.app' for separate hosting

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            fetch(API_BASE + '/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    // Store user email in localStorage for authentication
                    localStorage.setItem('userEmail', data.user.email);
                    alert('Login successful');
                    window.location.href = 'profile.html';
                } else {
                    alert(data.message);
                }
            })
            .catch(err => alert('Login failed'));
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const pin = document.getElementById('pin').value;
            fetch(API_BASE + '/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, pin })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                window.location.href = 'login.html';
            })
            .catch(err => alert('Registration failed'));
        });
    }

    // For profile
    if (document.getElementById('profileContent')) {
        const userEmail = localStorage.getItem('userEmail');
        fetch(API_BASE + '/api/profile?userEmail=' + encodeURIComponent(userEmail))
        .then(res => res.json())
        .then(data => {
            if (data.name) {
                document.getElementById('userName').textContent = 'Name: ' + data.name;
                document.getElementById('userEmail').textContent = 'Email: ' + data.email;
                document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                if (data.profilePic) {
                    // Display base64 image directly
                    document.getElementById('profileImg').src = data.profilePic;
                }
                
                // Load bank accounts for profile
                if (document.getElementById('bankAccountsDisplay')) {
                    fetch(API_BASE + '/api/bank-accounts?userEmail=' + encodeURIComponent(userEmail))
                    .then(res => res.json())
                    .then(bankData => {
                        const bankDisplay = document.getElementById('bankAccountsDisplay');
                        if (bankData.bankAccounts && bankData.bankAccounts.length > 0) {
                            bankDisplay.innerHTML = '';
                            bankData.bankAccounts.forEach(account => {
                                const p = document.createElement('p');
                                p.textContent = `${account.accountName} - ${account.accountNumber}`;
                                bankDisplay.appendChild(p);
                            });
                        } else {
                            bankDisplay.innerHTML = '<p><em>No bank accounts linked</em></p>';
                        }
                    })
                    .catch(err => console.log('Failed to load bank accounts'));
                }
            } else {
                document.getElementById('userName').textContent = 'No user data';
            }
        })
        .catch(err => {
            document.getElementById('userName').textContent = 'Error loading profile';
        });
    }

    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData();
            const fileInput = document.getElementById('profilePic');
            const userEmail = localStorage.getItem('userEmail');
            
            if (!userEmail) {
                alert('Please login first');
                return;
            }
            
            if (fileInput.files.length > 0) {
                formData.append('profilePic', fileInput.files[0]);
                formData.append('userEmail', userEmail);
                
                fetch(API_BASE + '/api/upload-profile-pic', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.profilePic) {
                        document.getElementById('profileImg').src = data.profilePic;
                        alert('Profile picture uploaded successfully');
                    } else {
                        alert(data.message);
                    }
                })
                .catch(err => alert('Upload failed: ' + err.message));
            } else {
                alert('Please select a file');
            }
        });
    }

    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const amount = document.getElementById('depositAmount').value;
            const pin = document.getElementById('depositPin').value;
            const userEmail = localStorage.getItem('userEmail');
            fetch(API_BASE + '/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, pin, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.payment_link) {
                    window.location.href = data.payment_link;
                } else {
                    alert(data.message);
                }
            })
            .catch(err => alert('Funding failed'));
        });
    }

    const changePinForm = document.getElementById('changePinForm');
    if (changePinForm) {
        changePinForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const currentPin = document.getElementById('currentPin').value;
            const newPin = document.getElementById('newPin').value;
            const userEmail = localStorage.getItem('userEmail');
            fetch(API_BASE + '/api/change-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPin, newPin, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
            })
            .catch(err => alert('PIN change failed'));
        });
    }

    const airtimeForm = document.getElementById('airtimeForm');
    if (airtimeForm) {
        // Load bank accounts for payment selection
        loadBankAccountsForPayment();
        
        airtimeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const network = document.getElementById('network').value;
            const phone = document.getElementById('phone').value;
            const amount = document.getElementById('amount').value;
            const pin = document.getElementById('pin').value;
            const paymentMethod = document.getElementById('paymentMethod').value;
            const accountNumber = paymentMethod === 'bank' ? document.getElementById('accountNumber').value : null;
            const userEmail = localStorage.getItem('userEmail');
            
            fetch(API_BASE + '/api/airtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ network, phone, amount, pin, paymentMethod, accountNumber, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                }
                alert(data.message);
            })
            .catch(err => alert('Purchase failed'));
        });
    }

    const dataForm = document.getElementById('dataForm');
    if (dataForm) {
        // Load bank accounts for payment selection
        loadBankAccountsForPayment();
        
        dataForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const network = document.getElementById('network').value;
            const phone = document.getElementById('phone').value;
            const plan = document.getElementById('plan').value;
            const pin = document.getElementById('pin').value;
            const paymentMethod = document.getElementById('paymentMethod').value;
            const accountNumber = paymentMethod === 'bank' ? document.getElementById('accountNumber').value : null;
            const userEmail = localStorage.getItem('userEmail');
            
            fetch(API_BASE + '/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, plan, network, pin, paymentMethod, accountNumber, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                }
                alert(data.message);
            })
            .catch(err => alert('Purchase failed'));
        });
    }

    const betForm = document.getElementById('betForm');
    if (betForm) {
        betForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const stake = document.getElementById('stake').value;
            const odds = document.getElementById('odds').value;
            const pin = document.getElementById('pin').value;
            const userEmail = localStorage.getItem('userEmail');
            fetch(API_BASE + '/api/bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stake, odds, pin, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                }
                alert(data.message);
            })
            .catch(err => alert('Bet failed'));
        });
    }

    const tvForm = document.getElementById('tvForm');
    if (tvForm) {
        // Load bank accounts for payment selection
        loadBankAccountsForPayment();
        
        tvForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const provider = document.getElementById('provider').value;
            const smartcard = document.getElementById('smartcard').value;
            const plan = document.getElementById('plan').value;
            const pin = document.getElementById('pin').value;
            const paymentMethod = document.getElementById('paymentMethod').value;
            const accountNumber = paymentMethod === 'bank' ? document.getElementById('accountNumber').value : null;
            const userEmail = localStorage.getItem('userEmail');
            
            fetch(API_BASE + '/api/tv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, plan, smartcard, pin, paymentMethod, accountNumber, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                }
                alert(data.message);
            })
            .catch(err => alert('Subscription failed'));
        });
    }

    // For home page
    if (document.getElementById('wallet')) {
        fetch(API_BASE + '/api/profile')
        .then(res => res.json())
        .then(data => {
            if (data.balance !== undefined) {
                document.getElementById('balance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
            }
        })
        .catch(err => console.log('No user data'));

        const userEmail = localStorage.getItem('userEmail');
        fetch(API_BASE + '/api/transactions?userEmail=' + encodeURIComponent(userEmail))
        .then(res => res.json())
        .then(data => {
            const list = document.getElementById('transactionList');
            if (data.transactions) {
                data.transactions.forEach(tx => {
                    const li = document.createElement('li');
                    li.textContent = `${tx.date}: ${tx.type} - ₦${tx.amount}`;
                    list.appendChild(li);
                });
            }
        })
        .catch(err => console.log('No transactions'));
    }

    const fundWalletForm = document.getElementById('fundWalletForm');
    if (fundWalletForm) {
        fundWalletForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const amount = document.getElementById('fundAmount').value;
            const pin = document.getElementById('fundPin').value;
            fetch(API_BASE + '/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, pin })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('balance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                    alert(data.message);
                } else {
                    alert(data.message);
                }
            })
            .catch(err => alert('Funding failed'));
        });
    }

    // Bank Accounts Management
    const bankAccountsList = document.getElementById('bankAccountsList');
    if (bankAccountsList) {
        const userEmail = localStorage.getItem('userEmail');
        fetch(API_BASE + '/api/bank-accounts?userEmail=' + encodeURIComponent(userEmail))
        .then(res => res.json())
        .then(data => {
            if (data.bankAccounts && data.bankAccounts.length > 0) {
                data.bankAccounts.forEach(account => {
                    const div = document.createElement('div');
                    div.className = 'bank-account-item';
                    div.innerHTML = `
                        <p><strong>${account.accountName}</strong></p>
                        <p>${account.accountNumber} - Bank Code: ${account.accountBank}</p>
                        <button onclick="removeBank('${account.accountNumber}')">Remove</button>
                    `;
                    bankAccountsList.appendChild(div);
                });
            } else {
                bankAccountsList.innerHTML = '<p>No bank accounts linked yet.</p>';
            }
        })
        .catch(err => console.log('Failed to load bank accounts'));
    }

    const linkBankForm = document.getElementById('linkBankForm');
    if (linkBankForm) {
        linkBankForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const accountNumber = document.getElementById('accountNumber').value;
            const accountBank = document.getElementById('accountBank').value;
            const pin = document.getElementById('linkPin').value;
            const userEmail = localStorage.getItem('userEmail');
            
            fetch(API_BASE + '/api/link-bank-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountNumber, accountBank, pin, userEmail })
            })
            .then(res => res.json())
            .then(data => {
                alert(data.message);
                if (data.account) {
                    location.reload();
                }
            })
            .catch(err => alert('Failed to link bank account'));
        });
    }
});

function removeBank(accountNumber) {
    const pin = prompt('Enter your PIN to remove this account:');
    if (!pin) return;
    const userEmail = localStorage.getItem('userEmail');
    
    fetch(API_BASE + '/api/remove-bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, pin, userEmail })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
        location.reload();
    })
    .catch(err => alert('Failed to remove bank account'));
}

function toggleBankSelect(selectElement) {
    const bankAccountDiv = document.getElementById('bankAccountSelect');
    if (selectElement.value === 'bank') {
        bankAccountDiv.style.display = 'block';
    } else {
        bankAccountDiv.style.display = 'none';
    }
}

function loadBankAccountsForPayment() {
    const userEmail = localStorage.getItem('userEmail');
    fetch(API_BASE + '/api/bank-accounts?userEmail=' + encodeURIComponent(userEmail))
    .then(res => res.json())
    .then(data => {
        const accountSelect = document.getElementById('accountNumber');
        if (accountSelect && data.bankAccounts) {
            accountSelect.innerHTML = '';
            if (data.bankAccounts.length === 0) {
                accountSelect.innerHTML = '<option value="">No accounts linked</option>';
            } else {
                data.bankAccounts.forEach(account => {
                    const option = document.createElement('option');
                    option.value = account.accountNumber;
                    option.textContent = `${account.accountName} - ${account.accountNumber}`;
                    accountSelect.appendChild(option);
                });
            }
        }
    })
    .catch(err => console.log('Failed to load bank accounts'));
}