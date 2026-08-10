/**
 * ISA-18.2 Alarm Rationalization Tests
 * Run with: node ml-model/tests/test_alarm_rationalization.js
 */

const { AlarmRationalization, ALARM_PRIORITIES } = require('../../backend/utils/alarmRationalization');

console.log("=== Alarm Rationalization Tests ===\n");

// Test 4: Alarm Cooldown
function testAlarmCooldown() {
  console.log("--- Test 4: Alarm Cooldown ---");
  const alarmSystem = new AlarmRationalization();
  const reactorId = 'A';

  const reactorData = {
    temperature: 165,
    gas_concentration: 10,
    data_quality: 'good',
  };
  const riskScore = 75;

  const alarmType = alarmSystem.classifyAlarm(reactorData, riskScore);
  console.log(`  Alarm type: ${alarmType}`);

  const decision1 = alarmSystem.shouldAlert(reactorId, alarmType, riskScore);
  console.log(`  Decision 1: should_alert=${decision1.should_alert}, reason=${decision1.reason || 'N/A'}`);

  if (!decision1.should_alert) throw new Error("First alarm should fire");
  if (decision1.is_flood_notification) throw new Error("Not a flood notification");

  // Second alarm immediately should be suppressed
  const decision2 = alarmSystem.shouldAlert(reactorId, alarmType, riskScore);
  console.log(`  Decision 2: should_alert=${decision2.should_alert}, reason=${decision2.reason || 'N/A'}`);

  if (decision2.should_alert) throw new Error("Second alarm should be suppressed");
  if (!decision2.reason.includes('Cooldown active')) throw new Error("Should show cooldown reason");

  console.log("  ✓ Test 4 PASSED\n");
  return true;
}

// Test 5: Flood Suppression
function testFloodSuppression() {
  console.log("--- Test 5: Flood Suppression ---");
  const alarmSystem = new AlarmRationalization();
  const reactorId = 'A';
  const riskScore = 40;

  // Strategy: Use 3 P2/P3 + 2 P1 for first 5 alarms (reaches count=5)
  // 6th: P1 type triggers flood notification (count=6)
  // 7th: Remaining P3 type (MAINTENANCE, unused so no cooldown) should be suppressed by flood
  const alarmTypes = [
    'WARNING_RISK',    // P2 - count=1
    'SENSOR_FAULT',    // P2 - count=2
    'DEGRADING',       // P3 - count=3
    'CRITICAL_GAS',    // P1 - count=4
    'CRITICAL_RISK',   // P1 - count=5
    'CRITICAL_TEMP',   // P1 - count=6, triggers flood notification
    'MAINTENANCE'      // P3 - count=7, should be flood-suppressed (no cooldown, priority>1)
  ];
  const results = [];

  for (let i = 0; i < alarmTypes.length; i++) {
    const alarmType = alarmTypes[i];
    const decision = alarmSystem.shouldAlert(reactorId, alarmType, riskScore);
    results.push(decision);
    console.log(`  Alarm ${i+1} (${alarmType}): should_alert=${decision.should_alert}, flood=${decision.is_flood_notification || false}, reason=${(decision.reason || decision.message || 'N/A').substring(0, 60)}`);
  }

  // First 5 should alert normally
  for (let i = 0; i < 5; i++) {
    if (!results[i].should_alert) throw new Error(`Alarm ${i+1} (${alarmTypes[i]}) should fire`);
    if (results[i].is_flood_notification) throw new Error(`Alarm ${i+1} should not be flood notification`);
  }

  // 6th should be flood notification
  if (!results[5].should_alert) throw new Error("6th alarm should be flood notification");
  if (!results[5].is_flood_notification) throw new Error("6th should be flood notification");
  if (!results[5].message.toLowerCase().includes('flood')) throw new Error("Should mention flood");

  // 7th (MAINTENANCE, P3) should be suppressed due to FLOOD (not cooldown)
  if (results[6].should_alert) throw new Error("7th P3 alarm should be suppressed due to flood");
  if (!results[6].reason.toLowerCase().includes('flood suppression')) throw new Error(`Should mention flood suppression, got: ${results[6].reason}`);

  // P1 should still fire even during flood (test separately with fresh counter)
  const alarmSystem2 = new AlarmRationalization();
  const reactorId2 = 'B';
  // First trigger flood on reactor B
  for (let i = 0; i < 6; i++) {
    alarmSystem2.shouldAlert(reactorId2, 'WARNING_RISK', 40);
  }
  // Now P1 should still fire
  const p1Decision = alarmSystem2.shouldAlert(reactorId2, 'CRITICAL_GAS', 85);
  console.log(`  P1 during flood: should_alert=${p1Decision.should_alert}`);
  if (!p1Decision.should_alert) throw new Error("P1 should still fire during flood");

  console.log("  ✓ Test 5 PASSED\n");
  return true;
}

// Run all tests
function runTests() {
  console.log("=".repeat(50));
  console.log("ISA-18.2 ALARM RATIONALIZATION TESTS");
  console.log("=".repeat(50));

  try {
    testAlarmCooldown();
    testFloodSuppression();

    console.log("=".repeat(50));
    console.log("✅ ALL ALARM RATIONALIZATION TESTS PASSED");
    console.log("=".repeat(50));
    return true;
  } catch (e) {
    console.log("\n" + "=".repeat(50));
    console.log("❌ TEST FAILED:", e.message);
    console.log("=".repeat(50));
    return false;
  }
}

const success = runTests();
process.exit(success ? 0 : 1);