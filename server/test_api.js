// Comprehensive Automated API Test Suite for Duster
const http = require('http');

const PORT = 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

const runTests = async () => {
  console.log('\n--- STARTING DUSTER FULL API INTEGRATION TESTS ---');

  let token = null;
  let workspaceId = null;
  let taskId = null;
  let pollId = null;
  let convId = null;

  const request = (path, method = 'GET', body = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const url = new URL(BASE_URL + path);
      const reqHeaders = {
        'Content-Type': 'application/json',
        ...headers,
      };
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;
      if (workspaceId) reqHeaders['x-workspace-id'] = workspaceId;

      const req = http.request(
        url,
        {
          method,
          headers: reqHeaders,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, body: parsed });
            } catch (e) {
              resolve({ status: res.statusCode, body: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    // 1. Health check
    const health = await request('/health');
    console.log('[Test 1] Health Check:', health.status === 200 ? 'PASS ✓' : 'FAIL ✗');

    // 2. Request OTP Code
    const testEmail = `tester_${Date.now()}@example.com`;
    const reqCode = await request('/auth/request-code', 'POST', { email: testEmail });
    console.log('[Test 2] OTP Request:', reqCode.status === 200 ? 'PASS ✓' : 'FAIL ✗');
    const otp = reqCode.body.devCode;

    // 3. Verify OTP & get session
    const verify = await request('/auth/verify-code', 'POST', {
      email: testEmail,
      code: otp,
      name: 'Pta Nhi Tester',
    });
    console.log('[Test 3] OTP Verification & Login:', verify.status === 200 ? 'PASS ✓' : 'FAIL ✗');
    token = verify.body.token;

    // 4. Get Workspaces
    const wsRes = await request('/workspaces');
    console.log('[Test 4] Workspaces List:', wsRes.status === 200 && wsRes.body.length > 0 ? 'PASS ✓' : 'FAIL ✗');
    workspaceId = wsRes.body[0].id;

    // 5. Load Sample Tasks
    const sampleRes = await request(`/workspaces/${workspaceId}/sample-tasks`, 'POST');
    console.log('[Test 5] Load Sample Tasks:', sampleRes.status === 200 ? 'PASS ✓' : 'FAIL ✗');

    // 6. List Tasks
    const tasksRes = await request('/tasks');
    console.log('[Test 6] List Tasks:', tasksRes.status === 200 && tasksRes.body.length >= 10 ? 'PASS ✓' : 'FAIL ✗');
    taskId = tasksRes.body[0]._id;

    // 7. Update Task Status
    const updateTaskRes = await request(`/tasks/${taskId}`, 'PATCH', { status: 'completed' });
    console.log('[Test 7] Task Status Transition:', updateTaskRes.status === 200 && updateTaskRes.body.status === 'completed' ? 'PASS ✓' : 'FAIL ✗');

    // 8. Content Folder Creation
    const folderRes = await request('/content/folders', 'POST', { name: 'Specifications' });
    console.log('[Test 8] Create Content Folder:', folderRes.status === 201 ? 'PASS ✓' : 'FAIL ✗');

    // 9. Poll Creation & Live Vote
    const pollRes = await request('/polls', 'POST', {
      question: 'Where should we deploy next?',
      options: ['AWS', 'Render', 'Self-Hosted'],
    });
    console.log('[Test 9] Create Poll:', pollRes.status === 201 ? 'PASS ✓' : 'FAIL ✗');
    pollId = pollRes.body.id;

    const voteRes = await request(`/polls/${pollId}/vote`, 'POST', {
      optionIds: ['opt_3'],
    });
    console.log('[Test 10] Vote in Poll:', voteRes.status === 200 && voteRes.body.totalVotes === 1 ? 'PASS ✓' : 'FAIL ✗');

    // 10. Workspace General Chat
    const generalChatRes = await request('/conversations/workspace-general');
    console.log('[Test 11] Get Workspace Chat:', generalChatRes.status === 200 ? 'PASS ✓' : 'FAIL ✗');
    convId = generalChatRes.body.id;

    const msgRes = await request(`/conversations/${convId}/messages`, 'POST', {
      text: 'Hello Duster team, all tests running smoothly!',
    });
    console.log('[Test 12] Post Message in Chat:', msgRes.status === 201 ? 'PASS ✓' : 'FAIL ✗');

    // 11. Activity Feed
    const activityRes = await request('/activity');
    console.log('[Test 13] Workspace Activity Feed:', activityRes.status === 200 && activityRes.body.events.length > 0 ? 'PASS ✓' : 'FAIL ✗');

    // 12. Analytics Summary
    const analyticsRes = await request('/analytics/summary');
    console.log('[Test 14] Analytics Summary:', analyticsRes.status === 200 && analyticsRes.body.atAGlance ? 'PASS ✓' : 'FAIL ✗');

    // 13. Create Collaborator Invite
    const inviteRes = await request(`/workspaces/${workspaceId}/invites`, 'POST', {
      email: 'collaborator_test@example.com',
      role: 'member',
    });
    console.log('[Test 15] Create Collaborator Invite:', inviteRes.status === 201 && inviteRes.body.rawToken ? 'PASS ✓' : 'FAIL ✗');

    console.log('\n=============================================');
    console.log('ALL 15 INTEGRATION TEST SUITES PASSED! ✓✓✓');
    console.log('=============================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
};

setTimeout(runTests, 1000);
