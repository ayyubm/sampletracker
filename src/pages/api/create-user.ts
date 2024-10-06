import { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { email, password, firstName, lastName, team, isAdmin } = req.body;

    try {
      const auth = getAuth();
      const db = getFirestore();

      // Create user in Firebase Authentication
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: `${firstName} ${lastName}`,
      });

      // Add user to Firestore
      await db.collection('users').doc(userRecord.uid).set({
        email,
        firstName,
        lastName,
        team,
        isAdmin,
      });

      res.status(200).json({ message: 'User created successfully', uid: userRecord.uid });
    } catch (error: unknown) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Error creating user', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}