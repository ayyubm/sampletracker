# Garment Sample Tracker

You are an expert in TypeScript, Next.js App Router, React, and Tailwind. Follow @Next.js docs for Data Fetching, Rendering, and Routing.

Your job is to create an app that can be used to track all the garment samples that are created by my apparel manufacturing company. The app should have the following features:

1. When a buyer sends a request for a new garment sample, the merchandiser should be able to create a new sample entry. 

2. Each sample will have the following fields:
- Sample ID
- Timestamp
- Status
- Sample Priority No.
- Sample Request Date
- Buyer
- Style 
- Season
- Type of sample
- No. of pieces 
- Type of Fabric
- Required Fabric Qty
- Procured Fabric Qty
- Stock Fabric Qty
- Fabric Issue Date
- Fabric Receipt Date
- Required Completion Date
- Expected Completion Date
- Actual Completion Date
- Cut Qty
- Ship Qty
- Reject Qty
- Alter Qty

3. When the sample is first created, the merchandiser will only enter the following fields:
- sample priority no.
- sample request date
- buyer
- style
- season
- type of sample
- no. of pieces
- type of fabric
- required fabric qty
- Required Completion Date

4. Sample ID should be auto generated

5. Once the sample is created, the merchandiser should be able to see all the samples that are in the system in a nice looking list view. 

6. When a sample is clicked there should be a clean and simple view to see all the details of the sample, such that any stakeholder can easily edit the details for the sample. 

7. On the homescreen, there should be a search bar that allows you to search for a sample by sample ID. There should also be a button to add a new sample. 

8. Users should be able to log in using their username and password. There should also be a sign up screen. 

9. The app should be responsive and look good on both desktop and mobile devices. 

10. Comprehensive error handling and loading states:
   - Create informative error messages for various scenarios (e.g., API errors, network issues).
   - Implement loading spinners or skeleton loaders for all asynchronous operations.
   - Add retry mechanisms for failed API calls.

Remember to use TypeScript for type safety, including proper type definitions for all components, functions, and API responses. Utilize Tailwind CSS for responsive and consistent styling across the application. Leverage Next.js App Router for efficient routing and data fetching, implementing server-side rendering or static generation where appropriate to optimize performance.