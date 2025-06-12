import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { constants, userToken } = body;

    // Basic validation
    if (!constants) {
      return NextResponse.json({ error: 'Constants data is required' }, { status: 400 });
    }

    if (!userToken) {
      return NextResponse.json({ error: 'User authentication required' }, { status: 401 });
    }

    // Note: In a production environment, you should validate the userToken
    // against your Firebase authentication and check admin status from Firestore
    // For now, we'll trust the frontend validation

    // Generate the constants file content
    const constantsContent = `export const SAMPLE_TYPE_OPTIONS = [
${constants.sampleTypes.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];

export const STATUS_OPTIONS = [
${constants.status.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];

export const SEASON_OPTIONS = [
${constants.seasons.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];

export const PATTERN_STATUS_OPTIONS = [
${constants.patternStatus.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];

export const PRODUCT_CATEGORY_OPTIONS = [
${constants.productCategory.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];

export const FABRIC_CATEGORY_OPTIONS = [
${constants.fabricCategory.map((option: string) => `  '${option.replace(/'/g, "\\'")}'`).join(',\n')}
];
`;

    // Write to the constants file
    const constantsPath = path.join(process.cwd(), 'src', 'lib', 'constants.ts');
    await writeFile(constantsPath, constantsContent, 'utf8');

    return NextResponse.json({ 
      success: true, 
      message: 'Constants file updated successfully' 
    });

  } catch (error) {
    console.error('Error updating constants file:', error);
    return NextResponse.json({ 
      error: 'Failed to update constants file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 