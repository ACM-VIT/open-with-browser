export default function Settings() {
  return (
    <div className="settings">
      <h2>Settings</h2>
      <p>Configure application preferences and browser settings.</p>
      
      <div className="settings-section">
        <h3>General Settings</h3>
        <div className="setting-item">
          <label>
            <input type="checkbox" defaultChecked />
            Remember browser choice
          </label>
        </div>
        <div className="setting-item">
          <label>
            <input type="checkbox" />
            Show browser icons
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Browser Settings</h3>
        <div className="setting-item">
          <label>
            Default browser:
            <select>
              <option>Google Chrome</option>
              <option>Microsoft Edge</option>
              <option>Firefox</option>
            </select>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Advanced</h3>
        <div className="setting-item">
          <label>
            <input type="checkbox" />
            Enable debug mode
          </label>
        </div>
      </div>
    </div>
  );
}
