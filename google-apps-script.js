/**
 * RAJ LIFE - Google Apps Script Web API
 * Updated: Birthday support added
 */

const SPREADSHEET_ID = '1zhZA7C7h2oqoB4PPyvp_ihjXP3UrQRNIlGvTjEwfojk';

const SHEET_NAMES = {
  income: 'Income',
  expenses: 'Expenses',
  loans: 'Loans',
  creditCards: 'CreditCards',
  otherIncome: 'OtherIncome',
  tasks: 'Tasks',
  goals: 'Goals',
  payments: 'Payments',
  birthdays: 'Birthdays'
};

const HEADERS = {
  income: ['ID', 'Title', 'Amount', 'Description', 'Created At', 'Month'],
  expenses: ['ID', 'Title', 'Amount', 'Description', 'Created At', 'Month'],
  loans: ['ID', 'Title', 'Amount', 'Person', 'Description', 'Created At', 'Month'],
  creditCards: ['ID', 'Title', 'Amount', 'Description', 'Created At', 'Month'],
  otherIncome: ['ID', 'Title', 'Amount', 'Description', 'Created At', 'Month'],
  tasks: ['ID', 'Title', 'Type', 'Priority', 'Description', 'Done', 'Created At', 'Month'],
  goals: ['ID', 'Title', 'Category', 'Deadline', 'Description', 'Progress', 'Done', 'Created At', 'Month'],
  payments: ['ID', 'Title', 'Amount', 'Due Date', 'Category', 'Description', 'Done', 'Created At', 'Month'],
  birthdays: ['ID', 'Name', 'Date', 'Relation', 'Note', 'Created At']
};

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    let result;
    switch(action) {
      case 'setup': result = setupSheets(); break;
      case 'getAll': result = getAllData(params.month); break;
      case 'add':
        const postData = JSON.parse(e.postData.contents);
        result = addItem(postData.category, postData.item, postData.month); break;
      case 'delete': result = deleteItem(params.category, params.id); break;
      case 'update':
        const updateData = JSON.parse(e.postData.contents);
        result = updateItem(updateData.category, updateData.id, updateData.updates); break;
      case 'getMonths': result = getAvailableMonths(); break;
      case 'getPassword': result = getPassword(); break;
      case 'setPassword': result = setPasswordFunc(params.password); break;
      default: result = { error: 'Unknown action' };
    }
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Object.keys(SHEET_NAMES).forEach(key => {
    let sheet = ss.getSheetByName(SHEET_NAMES[key]);
    if (!sheet) sheet = ss.insertSheet(SHEET_NAMES[key]);
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, HEADERS[key].length).setValues([HEADERS[key]]);
      sheet.getRange(1, 1, 1, HEADERS[key].length).setFontWeight('bold').setBackground('#6366f1').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }
  });
  return { success: true, message: 'All sheets created!' };
}

function getAllData(month) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const data = {};
  Object.keys(SHEET_NAMES).forEach(key => {
    const sheet = ss.getSheetByName(SHEET_NAMES[key]);
    if (!sheet || sheet.getLastRow() <= 1) { data[key] = []; return; }
    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];
    const items = [];
    for (let i = 1; i < rows.length; i++) {
      const item = {};
      headers.forEach((header, index) => {
        const col = header.toLowerCase().replace(/\s+/g, '');
        if (col === 'id') item.id = rows[i][index];
        else if (col === 'title') item.title = rows[i][index];
        else if (col === 'name') item.name = rows[i][index];
        else if (col === 'amount') item.amount = rows[i][index];
        else if (col === 'description') item.description = rows[i][index];
        else if (col === 'person') item.person = rows[i][index];
        else if (col === 'type') item.type = rows[i][index];
        else if (col === 'priority') item.priority = rows[i][index];
        else if (col === 'category') item.category = rows[i][index];
        else if (col === 'deadline') item.deadline = rows[i][index];
        else if (col === 'duedate') item.dueDate = rows[i][index];
        else if (col === 'date') item.date = rows[i][index];
        else if (col === 'relation') item.relation = rows[i][index];
        else if (col === 'note') item.note = rows[i][index];
        else if (col === 'progress') item.progress = Number(rows[i][index]) || 0;
        else if (col === 'done') item.done = rows[i][index] === true || rows[i][index] === 'TRUE' || rows[i][index] === 'true';
        else if (col === 'createdat') item.createdAt = rows[i][index];
        else if (col === 'month') item.month = rows[i][index];
      });
      // Birthdays are NOT month-filtered (they are permanent/yearly)
      if (key === 'birthdays') {
        items.push(item);
      } else if (!month || item.month === month) {
        items.push(item);
      }
    }
    data[key] = items;
  });
  return { success: true, data: data };
}

function addItem(category, item, month) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = SHEET_NAMES[category];
  if (!sheetName) return { error: 'Invalid category: ' + category };
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, HEADERS[category].length).setValues([HEADERS[category]]);
    sheet.getRange(1, 1, 1, HEADERS[category].length).setFontWeight('bold').setBackground('#6366f1').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  const currentMonth = month || getCurrentMonth();
  const id = Date.now();
  const createdAt = new Date().toISOString();
  let row;
  switch(category) {
    case 'income': case 'expenses': case 'otherIncome': case 'creditCards':
      row = [id, item.title, item.amount, item.description || '', createdAt, currentMonth]; break;
    case 'loans':
      row = [id, item.title, item.amount, item.person || '', item.description || '', createdAt, currentMonth]; break;
    case 'tasks':
      row = [id, item.title, item.type || 'daily', item.priority || 'medium', item.description || '', false, createdAt, currentMonth]; break;
    case 'goals':
      row = [id, item.title, item.category || 'personal', item.deadline || '', item.description || '', 0, false, createdAt, currentMonth]; break;
    case 'payments':
      row = [id, item.title, item.amount, item.dueDate || '', item.category || 'bill', item.description || '', false, createdAt, currentMonth]; break;
    case 'birthdays':
      row = [id, item.name, item.date || '', item.relation || 'friend', item.note || '', createdAt]; break;
    default:
      row = [id, item.title || item.name, item.amount || '', item.description || '', createdAt, currentMonth];
  }
  sheet.appendRow(row);
  return { success: true, id: id };
}

function deleteItem(category, id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = SHEET_NAMES[category];
  if (!sheetName) return { error: 'Invalid category' };
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found' };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function updateItem(category, id, updates) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = SHEET_NAMES[category];
  if (!sheetName) return { error: 'Invalid category' };
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return { error: 'Sheet not found' };
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      Object.keys(updates).forEach(field => {
        let colName;
        if (field === 'done') colName = 'Done';
        else if (field === 'progress') colName = 'Progress';
        else return;
        const colIndex = headers.indexOf(colName);
        if (colIndex !== -1) sheet.getRange(i + 1, colIndex + 1).setValue(updates[field]);
      });
      return { success: true };
    }
  }
  return { error: 'Not found' };
}

function getAvailableMonths() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const months = new Set();
  // Exclude birthdays sheet from month detection
  const monthSheets = Object.keys(SHEET_NAMES).filter(k => k !== 'birthdays');
  monthSheets.forEach(key => {
    const sheet = ss.getSheetByName(SHEET_NAMES[key]);
    if (!sheet || sheet.getLastRow() <= 1) return;
    const data = sheet.getDataRange().getValues();
    const monthCol = data[0].indexOf('Month');
    if (monthCol === -1) return;
    for (let i = 1; i < data.length; i++) { if (data[i][monthCol]) months.add(data[i][monthCol]); }
  });
  months.add(getCurrentMonth());
  return { success: true, months: Array.from(months).sort().reverse() };
}

function getCurrentMonth() {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[now.getMonth()] + ' ' + now.getFullYear();
}

function getPassword() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#6366f1').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.appendRow(['password', '1234']);
    return { success: true, password: '1234' };
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') return { success: true, password: String(data[i][1]) };
  }
  sheet.appendRow(['password', '1234']);
  return { success: true, password: '1234' };
}

function setPasswordFunc(newPassword) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#6366f1').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.appendRow(['password', newPassword]);
    return { success: true, message: 'Password set' };
  }
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'password') {
      sheet.getRange(i + 1, 2).setValue(newPassword);
      return { success: true, message: 'Password updated' };
    }
  }
  sheet.appendRow(['password', newPassword]);
  return { success: true, message: 'Password set' };
}
