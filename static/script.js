document.addEventListener('DOMContentLoaded', async () => {
    // 特性1の固定項目をチェックボックスとして表示
    const fixedFeatures = ['注意欠陥・多動性障害（ADHD）', '自閉症スペクトラム障害（ASD）', '学習障害（LD）', '聴覚障害', '視覚障害', '肢体不自由', '知的障害'];
    const fixedFeaturesContainer = document.getElementById('disability-features-1');
    
    fixedFeaturesContainer.innerHTML = '';
    
    fixedFeatures.forEach(feature => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'disability-features-1';
        checkbox.value = feature;
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(feature));
        
        fixedFeaturesContainer.appendChild(label);
    });

    // 特性2の項目をサーバーから取得してチェックボックスとして表示
    try {
        const response = await fetch('/get_other_features');
        const data = await response.json();
        const otherFeaturesContainer = document.getElementById('disability-features-2');
        
        otherFeaturesContainer.innerHTML = '';
        
        data.features.forEach(feature => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'disability-features-2';
            checkbox.value = feature;
            
            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(feature));
            
            otherFeaturesContainer.appendChild(label);
        });
    } catch (error) {
        console.error('Error fetching other features:', error);
        document.getElementById('disability-features-2').innerHTML = `
            <p class="error">項目の取得に失敗しました</p>
        `;
    }

    // 全てのチェックを外すボタンの機能
    document.getElementById('clear-all-features').addEventListener('click', () => {
        const allCheckboxes = document.querySelectorAll('.checkbox-group input[type="checkbox"]');
        allCheckboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        // 提案内容をリセット
        document.getElementById('result-content').innerHTML = `
            <p class="placeholder">上記のフォームを入力して、指導計画を生成してください。</p>
        `;
    });

    // データ一覧をサーバーから取得して表示
    try {
        const response = await fetch('/get_data');
        const data = await response.json();
        const dataListContent = document.getElementById('data-list-content');
        
        // データを表示するテーブルを作成
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>特性</th>
                    <th>学年</th>
                    <th>教科</th>
                    <th>合理的配慮</th>
                    <th>指導計画</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');

        // 検索機能の追加
        const searchInput = document.getElementById('data-search-input');
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            tbody.innerHTML = ''; // テーブルをクリア
            data.filter(row => JSON.stringify(row).toLowerCase().includes(searchTerm))
                .forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${row['特性']}</td>
                        <td>${row['学年']}</td>
                        <td>${row['教科']}</td>
                        <td>${row['合理的配慮']}</td>
                        <td>${row['指導計画']}</td>
                    `;
                    tbody.appendChild(tr);
                });
        });
        
        // 初期表示
        data.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row['特性']}</td>
                <td>${row['学年']}</td>
                <td>${row['教科']}</td>
                <td>${row['合理的配慮']}</td>
                <td>${row['指導計画']}</td>
            `;
            tbody.appendChild(tr);
        });

        dataListContent.innerHTML = '';
        dataListContent.appendChild(table);

    } catch (error) {
        console.error('Error fetching data list:', error);
        document.getElementById('data-list-content').innerHTML = `
            <p class="error">データ一覧の読み込みに失敗しました。</p>
        `;
    }
});


document.getElementById('planning-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const selectedFeatures1 = Array.from(document.querySelectorAll('#disability-features-1 input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    const selectedFeatures2 = Array.from(document.querySelectorAll('#disability-features-2 input[type="checkbox"]:checked')).map(checkbox => checkbox.value);
    const selectedFeatures = selectedFeatures1.concat(selectedFeatures2);
    
    const grade = document.getElementById('grade').value;
    const subject = document.getElementById('subject').value;

    try {
        // 指導計画を生成する
        const response = await fetch('/generate_plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                features: selectedFeatures,
                grade: grade,
                subject: subject
            })
        });

        const result = await response.json();

        // 提案内容を整形して表示する関数
        function formatResult(text) {
            // カンマ区切りまたは読点で分割
            let items = text.split(/[、,]/).map(item => item.trim()).filter(item => item.length > 0);
            
            if (items.length > 1) {
                let html = '<ul>';
                items.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                return html;
            } else {
                return `<p>${text}</p>`;
            }
        }

        document.getElementById('result-content').innerHTML = `
            <h3>合理的配慮</h3>
            ${formatResult(result.accommodations)}
            <h3>指導計画</h3>
            ${formatResult(result.plan)}
        `;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('result-content').innerHTML = `
            <p class="error">エラーが発生しました。入力内容を確認してください。</p>
        `;
    }
});