import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('dml2.editSQL', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active text editor.');
            return;
        }

        const document = editor.document;
        const insertStatement = document.getText();
        const lines = insertStatement.split('\n');
        
        // Extracting table name
        const tableNameMatches = lines.find(line => /insert into (.+)/i.test(line));
        if (!tableNameMatches) {
            vscode.window.showErrorMessage('Invalid insert statement. Table name not found.');
            return;
        }
        const tableName = "testing"
        // tableNameMatches.match(/insert into (.+)/i)[1].trim();

        // Extracting column names
        let columnNames: string[] = [];
        const columnLineIndex = lines.findIndex(line => /\(.*\)/.test(line));
        if (columnLineIndex === -1) {
            vscode.window.showErrorMessage('Invalid insert statement. Columns not found.');
            return;
        }
        const columnLine = lines[columnLineIndex];
        const columnsMatch = columnLine.match(/\((.*)\)/);
        if (columnsMatch) {
            columnNames = columnsMatch[1].split(',').map(col => col.trim());
        }

        // Extracting values
        const valuesStartIndex = lines.findIndex(line => line.trim().toLowerCase() === 'values');
        if (valuesStartIndex === -1 || valuesStartIndex === lines.length - 1) {
            vscode.window.showErrorMessage('Invalid insert statement. Values not found.');
            return;
        }
        let values = lines.slice(valuesStartIndex + 1, -1).map(line => line.match(/\((.*?)\)/)[1].split(',').map(s => s.trim()));
        
        // Displaying as table
        const panel = vscode.window.createWebviewPanel(
            'insertStatementAsTable',
            'Table View',
            vscode.ViewColumn.One,
            {}
        );

        const tableHtml = generateTableHtml(tableName, columnNames, values);
        panel.webview.html = tableHtml;

        console.warn("hellow0")

        // Update original SQL when document is saved
        const saveDisposable = vscode.workspace.onDidSaveTextDocument(() => {
            console.warn("hellow")
            const updatedInsertStatement = generateInsertStatement(tableName, columnNames, values);
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(0, 0, document.lineCount - 1, document.lineAt(document.lineCount - 1).text.length);
            edit.replace(document.uri, fullRange, updatedInsertStatement);
            vscode.workspace.applyEdit(edit);
        });

        context.subscriptions.push(saveDisposable);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}

function generateTableHtml(tableName: string, columnNames: string[], values: string[][]) {
    let tableHtml = `
        <html>
        <head>
            <style>
                table {
                    border-collapse: collapse;
                    width: 100%;
                }
                th, td {
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                }
                th {
                    background-color: #f2f2f2;
                }
            </style>
        </head>
        <body>
            <h2>${tableName}</h2>
            <table>
                <tr>
    `;

    // Generating column headers
    columnNames.forEach(column => {
        tableHtml += `<th>${column}</th>`;
    });

    tableHtml += `</tr>`;

    // Generating rows
    values.forEach((row, rowIndex) => {
        tableHtml += `<tr>`;
        row.forEach((value, colIndex) => {
            tableHtml += `<td contenteditable="true" data-row="${rowIndex}" data-col="${colIndex}">${value}</td>`;
        });
        tableHtml += `</tr>`;
    });

    tableHtml += `
            </table>
        </body>
        </html>
    `;

    return tableHtml;
}

function generateInsertStatement(tableName: string, columnNames: string[], values: string[][]) {
    const columns = columnNames.join(', ');
    const rows = values.map(row => `(${row.join(', ')})`).join(',\n\t');
    return `INSERT INTO ${tableName} (${columns})\nVALUES\n\t${rows};`;
}
