document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
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
            fetch('/api/register', {
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
        fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
            if (data.name) {
                document.getElementById('userName').textContent = 'Name: ' + data.name;
                document.getElementById('userEmail').textContent = 'Email: ' + data.email;
                document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                if (data.profilePic) {
                    document.getElementById('profileImg').src = '/uploads/' + data.profilePic;
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
            if (fileInput.files.length > 0) {
                formData.append('profilePic', fileInput.files[0]);
                fetch('/api/upload-profile-pic', {
                    method: 'POST',
                    body: formData
                })
                .then(res => res.json())
                .then(data => {
                    if (data.filename) {
                        document.getElementById('profileImg').src = '/uploads/' + data.filename;
                        alert('Profile picture uploaded successfully');
                    } else {
                        alert(data.message);
                    }
                })
                .catch(err => alert('Upload failed'));
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
            fetch('/api/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, pin })
            })
            .then(res => res.json())
            .then(data => {
                if (data.balance !== undefined) {
                    document.getElementById('userBalance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
                    alert(data.message);
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
            fetch('/api/change-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPin, newPin })
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
        airtimeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const network = document.getElementById('network').value;
            const phone = document.getElementById('phone').value;
            const amount = document.getElementById('amount').value;
            const pin = document.getElementById('pin').value;
            fetch('/api/airtime', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ network, phone, amount, pin })
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
        dataForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const phone = document.getElementById('phone').value;
            const plan = document.getElementById('plan').value;
            const pin = document.getElementById('pin').value;
            fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, plan, pin })
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
            fetch('/api/bet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stake, odds, pin })
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
        tvForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const provider = document.getElementById('provider').value;
            const plan = document.getElementById('plan').value;
            const pin = document.getElementById('pin').value;
            fetch('/api/tv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, plan, pin })
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
        fetch('/api/profile')
        .then(res => res.json())
        .then(data => {
            if (data.balance !== undefined) {
                document.getElementById('balance').textContent = 'Balance: ₦' + data.balance.toFixed(2);
            }
        })
        .catch(err => console.log('No user data'));

        fetch('/api/transactions')
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
            fetch('/api/deposit', {
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
});