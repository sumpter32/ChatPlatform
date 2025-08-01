export default function TestCSS() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">CSS Test Page</h1>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-red-500 text-white p-4 rounded">Red Box</div>
        <div className="bg-blue-500 text-white p-4 rounded">Blue Box</div>
        <div className="bg-green-500 text-white p-4 rounded">Green Box</div>
      </div>
      
      <div className="flex gap-4 items-center mb-8">
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Button
        </button>
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"></div>
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      
      <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Card Title</h2>
        <p className="text-gray-600">This is a test card to check if shadows and borders work.</p>
      </div>
    </div>
  );
}