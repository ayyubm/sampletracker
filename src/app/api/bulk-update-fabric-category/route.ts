import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userToken, fabricCategory } = body;

    if (!userToken) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    if (!fabricCategory) {
      return NextResponse.json({ error: 'Fabric category is required' }, { status: 400 });
    }

    // Get Firestore instance
    const db = getFirestore();
    
    // Get all samples (including archived ones)
    const samplesCollection = db.collection('samples');
    const snapshot = await samplesCollection.get();
    
    if (snapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'No samples found to update',
        updatedCount: 0 
      });
    }

    // Create batch for bulk update
    const batch = db.batch();
    let updateCount = 0;

    snapshot.docs.forEach((doc) => {
      const sampleData = doc.data();
      
      // Only update if fabric category is different
      if (sampleData.fabricCategory !== fabricCategory) {
        batch.update(doc.ref, {
          fabricCategory: fabricCategory,
          changeTracking: {
            ...sampleData.changeTracking,
            fabricCategory: {
              name: 'Admin Bulk Update',
              timestamp: new Date().toISOString()
            }
          }
        });
        updateCount++;
      }
    });

    // Commit the batch
    if (updateCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully updated ${updateCount} samples with fabric category: ${fabricCategory}`,
      updatedCount: updateCount 
    });

  } catch (error) {
    console.error('Error updating fabric categories:', error);
    return NextResponse.json({ 
      error: 'Failed to update fabric categories',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 