const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { ChatPromptTemplate } = require('@langchain/core/prompts');

function buildWorkspaceContextSummary({ name, memberCount, tasks = [] }) {
  const allTasks = Array.isArray(tasks) ? tasks : [];
  const openTasks = allTasks.filter((task) => task.status !== 'completed' && !task.isArchived);
  const completedTasks = allTasks.filter((task) => task.status === 'completed' && !task.isArchived);
  const inProgress = allTasks.filter((task) => task.status === 'in_progress' && !task.isArchived);

  const prioritySummary = ['p0', 'p1', 'p2', 'p3', 'p4']
    .map((level) => {
      const count = allTasks.filter((task) => (task.priority || 'p1').toLowerCase() === level).length;
      return `${level}:${count}`;
    })
    .join(', ');

  const tagSummary = [...new Set(allTasks.flatMap((task) => Array.isArray(task.tags) ? task.tags : []))]
    .slice(0, 6)
    .join(', ') || 'none';

  const topOpenTaskNames = openTasks.slice(0, 4).map((task) => `${task.title} (${task.status}, ${task.priority || 'p1'})`);

  return [
    `Workspace: ${name}`,
    `Members: ${memberCount}`,
    `Open tasks: ${openTasks.length}; Completed: ${completedTasks.length}; In progress: ${inProgress.length}`,
    `Priority mix: ${prioritySummary}`,
    `Visible tags: ${tagSummary}`,
    `Current focus: ${topOpenTaskNames.length ? topOpenTaskNames.join(' | ') : 'No active tasks'}`,
  ].join('\n');
}

async function generateWorkspaceAssistantReply({ workspaceName, memberCount, tasks = [], userPrompt }) {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return {
      answer:
        'AI workspace assistance is not enabled yet. Add GOOGLE_API_KEY to the server environment and restart the API to enable Gemini-powered summaries.',
      mode: 'unconfigured',
    };
  }

  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    temperature: 0.2,
  });

  const workspaceContext = buildWorkspaceContextSummary({
    name: workspaceName,
    memberCount,
    tasks,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      'You are a concise project operations assistant. Use the workspace snapshot to advise on priorities, risks, and next steps. Be practical, brief, and actionable.',
    ],
    ['human', 'Workspace snapshot:\n{workspaceContext}\n\nUser request:\n{userPrompt}'],
  ]);

  const formattedPrompt = await prompt.format({
    workspaceContext,
    userPrompt: userPrompt || 'Give me a concise status update and suggested next actions.',
  });

  const response = await model.invoke(formattedPrompt);
  const answer = Array.isArray(response.content)
    ? response.content.map((piece) => piece?.text || '').join('')
    : typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content || {});

  return {
    answer: answer.trim(),
    mode: 'llm',
  };
}

module.exports = {
  buildWorkspaceContextSummary,
  generateWorkspaceAssistantReply,
};
