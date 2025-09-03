import pandas as pd
from flask import Flask, request, jsonify, render_template
from sklearn.tree import DecisionTreeClassifier
from sklearn.preprocessing import MultiLabelBinarizer, LabelEncoder

app = Flask(__name__)

# 特性１の固定項目
fixed_features = ['注意欠陥・多動性障害（ADHD）', '自閉症スペクトラム障害（ASD）', '学習障害（LD）', '聴覚障害', '視覚障害', '肢体不自由', '知的障害']

# --- AIモデルの学習と準備 ---
# 学習データの読み込み
df = pd.read_csv('data.csv')

# 特性の文字列をリストに変換
def string_to_list(s):
    return [x.strip() for x in str(s).split(',')]

df['特性'] = df['特性'].apply(string_to_list)

# 特性１以外の動的な特性を抽出
all_features = set(item for sublist in df['特性'] for item in sublist)
other_features = sorted(list(all_features - set(fixed_features)))

# データをモデルが理解できる数値に変換
mlb = MultiLabelBinarizer()
mlb.fit(df['特性'])
le = LabelEncoder()
le.fit(df['学年'])
le_subject = LabelEncoder()
le_subject.fit(df['教科'])

X_processed = pd.concat([
    pd.DataFrame(mlb.transform(df['特性']), columns=mlb.classes_),
    pd.DataFrame(le.transform(df['学年']), columns=['学年']),
    pd.DataFrame(le_subject.transform(df['教科']), columns=['教科'])
], axis=1)

y_accommodations = df['合理的配慮']
y_plan = df['指導計画']

# AIモデル（決定木）の初期化と学習
model_accommodations = DecisionTreeClassifier()
model_accommodations.fit(X_processed, y_accommodations)

model_plan = DecisionTreeClassifier()
model_plan.fit(X_processed, y_plan)

# --- Webサーバーの定義 ---
@app.route('/')
def serve_html():
    return render_template('index.html')

@app.route('/get_other_features')
def get_other_features():
    return jsonify({'features': other_features})

@app.route('/get_data')
def get_data():
    df_display = df.copy()
    df_display['特性'] = df_display['特性'].apply(lambda x: ', '.join(x))
    # '特性' 列を基準にソートしてから返す
    df_sorted = df_display.sort_values(by='特性')
    return jsonify(df_sorted.to_dict('records'))

@app.route('/generate_plan', methods=['POST'])
def generate_plan():
    data = request.json
    selected_features = data['features']
    grade = data['grade']
    subject = data['subject']
    
    # Webページからの入力データをモデルが理解できる形式に変換
    input_features_encoded = mlb.transform([selected_features])
    
    input_grade_encoded = le.transform([int(grade)])
    input_subject_encoded = le_subject.transform([subject])
    
    # 変換したデータを結合
    input_processed = pd.concat([
        pd.DataFrame(input_features_encoded, columns=mlb.classes_),
        pd.DataFrame(input_grade_encoded, columns=['学年']),
        pd.DataFrame(input_subject_encoded, columns=['教科'])
    ], axis=1)

    # AIモデルを使って指導計画を生成
    generated_accommodations = model_accommodations.predict(input_processed)[0]
    generated_plan = model_plan.predict(input_processed)[0]
    
    response = {
        'accommodations': generated_accommodations,
        'plan': generated_plan
    }

    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True)