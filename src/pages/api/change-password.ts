import { NextApiRequest, NextApiResponse } from 'next';
import { changeUserPassword } from '../../lib/db'; // Adjust import path as needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { userId, newPassword } = req.body;
    try {
      await changeUserPassword(userId, newPassword);
      res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Error changing password', error });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}