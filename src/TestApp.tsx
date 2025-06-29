// Simple test component to verify React is working

const TestApp = () => {
  console.log('TestApp rendering...')
  console.log('Environment variables:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'
  })

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#f0f0f0',
      minHeight: '100vh'
    }}>
      <h1 style={{ color: '#333' }}>🏌️ Golf Tournament System - Test Page</h1>
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2>✅ React is Working!</h2>
        <p>If you can see this page, React is loading successfully.</p>
        
        <h3>Environment Check:</h3>
        <ul>
          <li>
            <strong>Supabase URL:</strong> {' '}
            {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Not set'}
            {import.meta.env.VITE_SUPABASE_URL && (
              <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666' }}>
                ({import.meta.env.VITE_SUPABASE_URL})
              </span>
            )}
          </li>
          <li>
            <strong>Supabase Key:</strong> {' '}
            {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set'}
          </li>
        </ul>

        <h3>Current Status:</h3>
        <p>This is a simplified test version. Once this works, we'll switch back to the full app.</p>
        
        <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          borderRadius: '4px' 
        }}>
          <strong>Next Steps:</strong>
          <ol>
            <li>Verify this test page loads on Netlify</li>
            <li>Check browser console for any errors</li>
            <li>Confirm environment variables are set</li>
            <li>Switch back to main app</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default TestApp