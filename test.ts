async function run() {
    try {
        const tenantId = `test-church-\${Date.now()}`;
        const email = `test-\${Date.now()}@example.com`;

        console.log('1. Registering...', { email, tenantId });
        const regRes = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password',
                name: 'Admin',
                churchName: 'Test Church',
                tenantId
            })
        });
        console.log('Reg HTTP status:', regRes.status);
        const regData = await regRes.json();
        console.log('Reg Response:', regData);

        console.log('2. Logging in...');
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                password: 'password',
                tenantId
            })
        });

        console.log('Login HTTP status:', loginRes.status);
        const loginData = await loginRes.json();
        console.log('Login Response:', loginData);
        if (!loginData.token) return;

        const token = loginData.token;
        console.log('Token acquired:', token.slice(0, 20) + '...');

        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer \${token}` };

        console.log('3. Getting Profile...');
        const profileRes = await fetch('http://localhost:3000/api/tenant/profile', { headers });
        console.log('Profile HTTP:', profileRes.status);
        console.log('Profile:', await profileRes.json());

        console.log('4. Updating Profile...');
        const patchRes = await fetch('http://localhost:3000/api/tenant/profile', {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
                address: '123 Test St',
                phone: '12345'
            })
        });
        console.log('Patch HTTP:', patchRes.status);
        console.log('Patch success:', await patchRes.json());

        console.log('5. Adding Branch...');
        const branchRes = await fetch('http://localhost:3000/api/tenant/branch', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'North Campus',
                address: '123 North St'
            })
        });
        console.log('Branch HTTP:', branchRes.status);
        console.log('Branch success:', await branchRes.json());

    } catch (err: any) {
        console.error('Network Error:', err.message);
    }
}

run();
