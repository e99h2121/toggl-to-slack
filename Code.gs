// 自身のSpleadsheet URLに書き換える
const ssurl = 'https://docs.google.com/spreadsheets/d/hogehogehoge';
// 自身のSlack WebHookのURLに書き換える 
const slackurl = 'https://hooks.slack.com/workflows/xxxxx/zzzzzz';
// 自身のToggl の API Tokenに書き換える
const authkey = '{your toggl token}:api_token';

// Slackに投稿するためのAPIリクエスト
var Slack = {
  post: function(message){
    var url = slackurl;
    var payload = {
      text: message
    };
    var options = {
      'method': 'POST',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload)
    }
    var response = UrlFetchApp.fetch(url, options);
    return response;
  },
}

// Toggl APIにアクセスするための各種エンドポイント
var Toggl = {
  BASIC_AUTH: authkey,

  get: function(path){
    var url = 'https://www.toggl.com/api/v8' + path;
    var options = {
      'method' : 'GET',
      'headers': {"Authorization" : "Basic " + Utilities.base64Encode(this.BASIC_AUTH)}
    }
    var response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response);
  },
  getTimeEntries: function(){
    var path = '/time_entries'
    return this.get(path)
  },
  getProject: function(id) {
    var path = '/projects/' + id
    return this.get(path);
  }
}

// 日付レイアウトの変換メソッド
function dateStyle(date, format) {
    format = format.replace(/YYYY/, date.getFullYear());
    format = format.replace(/MM/, date.getMonth() + 1);
    format = format.replace(/DD/, date.getDate());
    return format;
}

// 実行メソッド
function main() {
  var now = new Date();
  var yesterday = dateStyle(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), 'YYYY/MM/DD'); //昨日の日付を整形して取得
  var timeEntries = Toggl.getTimeEntries();
  var data = []; // Slackに投稿するためのタスクをストックする変数

  // タスク一覧を一つずつ配列にpush
  var len = timeEntries.length;

  for(let i=0; i<len; i++) {
    var timeEntry = timeEntries[i]; // タスク一覧から一つずつ取得
    // タスクのプロジェクトidからプロジェクト名を取得ない場合は、エラーになるので、else処理を用意
    var projectName = 'pid' in timeEntry ? Toggl.getProject(timeEntry.pid).data.name : 'No Project';
    var targetEntryDate = timeEntry.start.substr(0,10).split('-'); // タスクの日付をして取得
    var entryStart = dateStyle(new Date(targetEntryDate[0], targetEntryDate[1] - 1, targetEntryDate[2]), 'YYYY/MM/DD') // タスクの日付レイアウト整形

    if(i===0) {
      // 日付の情報は一つでいいので、一度だけpush
      data.push('*' + yesterday + 'のレポート*')
    }
    if(entryStart === yesterday) {
      // 昨日のタスクだけpush（投稿イメージ：【プロジェクト名】タスク名　40分）
      data.push('【' + projectName + '】 *' + timeEntry.description + '*　' + Math.round(timeEntry.duration/60/60*60) + '分')
    }
   Utilities.sleep(1000);
  }

  // 実績がない日(タイトルのみ1行の日)は終了
  if (data.length == 1) {
    return;
  }
  
  // スプレッドシートに実績投稿
  postSpreadSheet(data);

  // Slackに実績投稿
  data.push('see :' + ssurl);
  postSlack(data);

}


function postSlack(message) {
  // Slackに投稿　昨日のタスクが配列で溜まっているので、改行コードでjoinしてまとめてSlackにPOSTします。
  Slack.post(message.join('\n'))
}

function postSpreadSheet(message) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('daily');
  sheet.appendRow([message.join(',')]);
}
