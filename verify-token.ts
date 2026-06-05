import jwt from 'jsonwebtoken';
import 'dotenv/config';

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhYzkxMDdmNi05MDZmLTRkYjctOGNmYS02ZjNkMTE1NTgxYTIiLCJ0ZW5hbnRJZCI6InRlc3QtY2h1cmNoLSR7RGF0ZS5ub3coKX0iLCJyb2xlSWQiOiIiLCJpYXQiOjE3NzU1NzQzODksImV4cCI6MTc3NTYwMzE4OX0.AH5ZXdjifZFm_iFhwjMrkl0KyotPyJOOBswBFaKEUr0';
const secret = process.env.JWT_SECRET || 'secret';

console.log('Secret used:', secret);

try {
    const decoded = jwt.verify(token, secret);
    console.log('Decoded:', decoded);
} catch (err: any) {
    console.log('Verify failed:', err.message);

    // Try with 'secret' payload just in case
    try {
        const decodedSecret = jwt.verify(token, 'secret');
        console.log('Decoded with "secret":', decodedSecret);
    } catch (err2: any) {
        console.log('Verify with "secret" failed:', err2.message);
    }
}
