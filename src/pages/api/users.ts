import { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '../../lib/firebase/firebaseUtils'; // Adjust import path as needed

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { adminUser, ...newUserData } = req.body;
      const newUser = await createUser(newUserData, adminUser);
      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      const errorMessage = (error as Error).message;
      res.status(500).json({ message: 'Error creating user', error: errorMessage });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}