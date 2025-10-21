use desktop_lib::diagnostics::DiagnosticsState;

#[test]
fn record_creates_entries_and_enforces_capacity() {
    let state = DiagnosticsState::default();

    for i in 0..510 {
        state.record(format!("event #{i}"));
    }

    let snapshot = state.snapshot();
    // Max entries is 500; ensure oldest entries dropped
    assert_eq!(snapshot.len(), 500);
    assert!(snapshot.first().unwrap().message.starts_with("event #10"));
    assert!(snapshot.last().unwrap().message.starts_with("event #509"));
}

#[test]
fn clear_removes_all_entries() {
    let state = DiagnosticsState::default();
    state.record("first" );
    state.record("second");

    assert_eq!(state.snapshot().len(), 2);

    state.clear();

    assert!(state.snapshot().is_empty());
}
