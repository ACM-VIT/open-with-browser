export default function Rules() {
  return (
    <div className='rules'>
      <h2>Rules</h2>
      <p>
        Manage browser selection rules for different domains and file types.
      </p>

      <div className='rules-section'>
        <h3>Domain Rules</h3>
        <p>Configure which browser to use for specific domains.</p>
        <div className='placeholder'>
          <p>Domain rules will be displayed here</p>
        </div>
      </div>

      <div className='rules-section'>
        <h3>File Type Rules</h3>
        <p>Configure which browser to use for specific file types.</p>
        <div className='placeholder'>
          <p>File type rules will be displayed here</p>
        </div>
      </div>
    </div>
  );
}
