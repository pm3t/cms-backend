import axios from 'axios';

async function testSave() {
    try {
        const res = await axios.post('http://localhost:3000/api/finance', {
            type: 'OFFERING',
            amount: 1000000,
            category: 'Test Category',
            description: 'Test Description',
            memberId: '4e3d223a-7417-4d49-a367-2ad5d7545f9b', // Ananya Putri
            projectId: 'some-uuid-if-exists',
            pledgeId: 'some-uuid-if-exists'
        }, {
            headers: { Authorization: 'Bearer YOUR_TOKEN_HERE' }
        });
        console.log('Success:', res.data);
    } catch (err: any) {
        console.log('Error:', err.response?.data || err.message);
    }
}
