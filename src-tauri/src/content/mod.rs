//! Carrega e valida as questões de `content/problems/<slug>/` (spec 002).

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Difficulty {
    Easy,
    Medium,
    Hard,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Comparator {
    #[default]
    Exact,
    Unordered,
    Float,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Param {
    pub name: String,
    #[serde(rename = "type")]
    pub ty: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Complexity {
    pub time: String,
    pub space: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TestCase {
    pub args: Vec<Value>,
    pub expected: Value,
    #[serde(default)]
    pub hidden: bool,
}

fn default_time_limit() -> u64 {
    2000
}

#[derive(Debug, Clone, Deserialize)]
struct Meta {
    id: String,
    title: String,
    difficulty: Difficulty,
    unit: String,
    #[serde(default)]
    tags: Vec<String>,
    entrypoint: String,
    params: Vec<Param>,
    returns: String,
    #[serde(default)]
    comparator: Comparator,
    #[serde(default = "default_time_limit")]
    time_limit_ms: u64,
    #[serde(default)]
    hints: Vec<String>,
    #[serde(default)]
    complexity: Option<Complexity>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Problem {
    pub slug: String,
    pub title: String,
    pub difficulty: Difficulty,
    pub unit: String,
    pub tags: Vec<String>,
    pub entrypoint: String,
    pub params: Vec<Param>,
    pub returns: String,
    pub comparator: Comparator,
    pub time_limit_ms: u64,
    pub hints: Vec<String>,
    pub complexity: Option<Complexity>,
    pub statement: String,
    pub starter: String,
    pub solution: String,
    pub tests: Vec<TestCase>,
}

#[derive(Debug, Default)]
pub struct Loaded {
    pub problems: Vec<Problem>,
    /// Questões ignoradas e o motivo (RF-1): vão para o log, não derrubam o app.
    pub warnings: Vec<String>,
}

pub const MAX_HINTS: usize = 3;

pub fn is_valid_type(ty: &str) -> bool {
    let ty = ty.trim();
    if let Some(inner) = ty.strip_prefix("list[").and_then(|r| r.strip_suffix(']')) {
        return is_valid_type(inner);
    }
    matches!(ty, "int" | "float" | "str" | "bool" | "ListNode" | "TreeNode")
}

fn is_identifier(s: &str) -> bool {
    let mut chars = s.chars();
    matches!(chars.next(), Some(c) if c.is_ascii_alphabetic() || c == '_')
        && chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn read(dir: &Path, name: &str) -> Result<String, String> {
    fs::read_to_string(dir.join(name)).map_err(|e| format!("{name}: {e}"))
}

/// Lê uma pasta de questão. O erro descreve o primeiro problema encontrado.
pub fn load_problem(dir: &Path) -> Result<Problem, String> {
    let slug = dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("invalid folder name")?
        .to_string();

    let meta: Meta =
        serde_json::from_str(&read(dir, "meta.json")?).map_err(|e| format!("meta.json: {e}"))?;
    let tests: Vec<TestCase> =
        serde_json::from_str(&read(dir, "tests.json")?).map_err(|e| format!("tests.json: {e}"))?;
    let statement = read(dir, "statement.md")?;
    let starter = read(dir, "starter.py")?;
    let solution = read(dir, "solution.py")?;

    if meta.id != slug {
        return Err(format!("meta.json: id '{}' must match the folder name", meta.id));
    }
    if meta.title.trim().is_empty() {
        return Err("meta.json: title is empty".into());
    }
    if meta.unit.trim().is_empty() {
        return Err("meta.json: unit is empty".into());
    }
    if !is_identifier(&meta.entrypoint) {
        return Err(format!(
            "meta.json: entrypoint '{}' is not a valid function name",
            meta.entrypoint
        ));
    }
    for p in &meta.params {
        if !is_identifier(&p.name) {
            return Err(format!("meta.json: invalid param name '{}'", p.name));
        }
        if !is_valid_type(&p.ty) {
            return Err(format!("meta.json: unknown type '{}' for param '{}'", p.ty, p.name));
        }
    }
    if !is_valid_type(&meta.returns) {
        return Err(format!("meta.json: unknown return type '{}'", meta.returns));
    }
    if meta.time_limit_ms == 0 {
        return Err("meta.json: time_limit_ms must be positive".into());
    }
    if meta.hints.len() > MAX_HINTS {
        return Err(format!("meta.json: at most {MAX_HINTS} hints"));
    }
    if statement.trim().is_empty() {
        return Err("statement.md is empty".into());
    }
    if !tests.iter().any(|t| !t.hidden) {
        return Err("tests.json: needs at least one visible test".into());
    }
    for (i, t) in tests.iter().enumerate() {
        if t.args.len() != meta.params.len() {
            return Err(format!(
                "tests.json: test {i} has {} args, expected {}",
                t.args.len(),
                meta.params.len()
            ));
        }
    }

    Ok(Problem {
        slug,
        title: meta.title,
        difficulty: meta.difficulty,
        unit: meta.unit,
        tags: meta.tags,
        entrypoint: meta.entrypoint,
        params: meta.params,
        returns: meta.returns,
        comparator: meta.comparator,
        time_limit_ms: meta.time_limit_ms,
        hints: meta.hints,
        complexity: meta.complexity,
        statement,
        starter,
        solution,
        tests,
    })
}

/// Carrega todas as questões de `<content_dir>/problems`, em ordem de slug.
pub fn load_all(content_dir: &Path) -> Loaded {
    let mut loaded = Loaded::default();
    let root = content_dir.join("problems");
    let entries = match fs::read_dir(&root) {
        Ok(e) => e,
        Err(e) => {
            loaded.warnings.push(format!("{}: {e}", root.display()));
            return loaded;
        }
    };
    let mut dirs: Vec<_> = entries
        .filter_map(Result::ok)
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    for dir in dirs {
        match load_problem(&dir) {
            Ok(p) => loaded.problems.push(p),
            Err(e) => loaded.warnings.push(format!("{}: {e}", dir.display())),
        }
    }
    loaded
}

#[cfg(test)]
pub mod testing {
    use super::*;
    use serde_json::json;

    /// Questão sintética para testes: soma de dois inteiros.
    pub fn add_problem() -> Problem {
        Problem {
            slug: "add".into(),
            title: "Add".into(),
            difficulty: Difficulty::Medium,
            unit: "warmup".into(),
            tags: vec![],
            entrypoint: "add".into(),
            params: vec![
                Param { name: "a".into(), ty: "int".into() },
                Param { name: "b".into(), ty: "int".into() },
            ],
            returns: "int".into(),
            comparator: Comparator::Exact,
            time_limit_ms: 1000,
            hints: vec!["first".into(), "second".into()],
            complexity: None,
            statement: "Add two numbers.".into(),
            starter: "def add(a, b):\n    pass\n".into(),
            solution: "def add(a, b):\n    return a + b\n".into(),
            tests: vec![
                TestCase { args: vec![json!(1), json!(2)], expected: json!(3), hidden: false },
                TestCase { args: vec![json!(-5), json!(5)], expected: json!(0), hidden: false },
                TestCase { args: vec![json!(40), json!(2)], expected: json!(42), hidden: true },
            ],
        }
    }

    pub fn write_problem(root: &Path, p: &Problem) -> std::path::PathBuf {
        let dir = root.join("problems").join(&p.slug);
        fs::create_dir_all(&dir).unwrap();
        let meta = json!({
            "id": p.slug, "title": p.title, "difficulty": p.difficulty, "unit": p.unit,
            "tags": p.tags, "entrypoint": p.entrypoint, "params": p.params,
            "returns": p.returns, "comparator": p.comparator,
            "time_limit_ms": p.time_limit_ms, "hints": p.hints,
        });
        fs::write(dir.join("meta.json"), meta.to_string()).unwrap();
        fs::write(dir.join("tests.json"), serde_json::to_string(&p.tests).unwrap()).unwrap();
        fs::write(dir.join("statement.md"), &p.statement).unwrap();
        fs::write(dir.join("starter.py"), &p.starter).unwrap();
        fs::write(dir.join("solution.py"), &p.solution).unwrap();
        dir
    }
}

#[cfg(test)]
mod tests {
    use super::testing::*;
    use super::*;

    #[test]
    fn loads_a_valid_problem() {
        let tmp = tempfile::tempdir().unwrap();
        let p = add_problem();
        write_problem(tmp.path(), &p);

        let loaded = load_all(tmp.path());

        assert!(loaded.warnings.is_empty(), "{:?}", loaded.warnings);
        assert_eq!(loaded.problems, vec![p]);
    }

    // CA-11: pasta sem tests.json → a questão não aparece e o resto carrega.
    #[test]
    fn problem_without_tests_file_is_skipped() {
        let tmp = tempfile::tempdir().unwrap();
        let good = add_problem();
        write_problem(tmp.path(), &good);
        let mut broken = add_problem();
        broken.slug = "broken".into();
        let dir = write_problem(tmp.path(), &broken);
        fs::remove_file(dir.join("tests.json")).unwrap();

        let loaded = load_all(tmp.path());

        assert_eq!(loaded.problems.len(), 1);
        assert_eq!(loaded.problems[0].slug, "add");
        assert_eq!(loaded.warnings.len(), 1);
        assert!(loaded.warnings[0].contains("tests.json"));
    }

    #[test]
    fn rejects_schema_problems() {
        let cases: Vec<(&str, Box<dyn Fn(&mut Problem)>)> = vec![
            ("unknown type", Box::new(|p| p.params[0].ty = "matrix".into())),
            ("unknown return type", Box::new(|p| p.returns = "set[int]".into())),
            ("entrypoint", Box::new(|p| p.entrypoint = "not valid".into())),
            ("visible test", Box::new(|p| p.tests.iter_mut().for_each(|t| t.hidden = true))),
            ("args", Box::new(|p| p.tests[0].args.pop().map(|_| ()).unwrap())),
            ("hints", Box::new(|p| p.hints = vec!["a".into(); 4])),
        ];
        for (expected, mutate) in cases {
            let tmp = tempfile::tempdir().unwrap();
            let mut p = add_problem();
            mutate(&mut p);
            let dir = write_problem(tmp.path(), &p);
            let err = load_problem(&dir).unwrap_err();
            assert!(err.contains(expected), "expected '{expected}' in '{err}'");
        }
    }

    #[test]
    fn folder_name_must_match_id() {
        let tmp = tempfile::tempdir().unwrap();
        let dir = write_problem(tmp.path(), &add_problem());
        let renamed = dir.with_file_name("other");
        fs::rename(&dir, &renamed).unwrap();
        assert!(load_problem(&renamed).unwrap_err().contains("folder name"));
    }

    #[test]
    fn missing_content_dir_is_a_warning_not_a_crash() {
        let tmp = tempfile::tempdir().unwrap();
        let loaded = load_all(&tmp.path().join("nope"));
        assert!(loaded.problems.is_empty());
        assert_eq!(loaded.warnings.len(), 1);
    }

    #[test]
    fn type_grammar() {
        for ok in ["int", "list[int]", "list[list[str]]", "ListNode", "list[ListNode]", "TreeNode"] {
            assert!(is_valid_type(ok), "{ok}");
        }
        for bad in ["", "list", "list[", "dict[str,int]", "listnode"] {
            assert!(!is_valid_type(bad), "{bad}");
        }
    }

    fn validator(content: &Path) -> std::process::Output {
        let script = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("..")
            .join("scripts")
            .join("validate_content.py");
        std::process::Command::new(crate::runner::find_python().unwrap())
            .arg(script)
            .arg(content)
            .output()
            .unwrap()
    }

    // CA-12: o validador aprova conteúdo bom e falha se a solução de referência não passa.
    #[test]
    fn validator_script_passes_good_content_and_fails_broken_content() {
        let tmp = tempfile::tempdir().unwrap();
        write_problem(tmp.path(), &add_problem());
        let out = validator(tmp.path());
        assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stdout));

        let mut wrong = add_problem();
        wrong.slug = "wrong".into();
        wrong.solution = "def add(a, b):\n    return a - b\n".into();
        write_problem(tmp.path(), &wrong);
        let out = validator(tmp.path());
        assert_eq!(out.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&out.stdout).contains("FAIL wrong"));
    }

    // Um starter que já resolve a questão também reprova.
    #[test]
    fn validator_script_rejects_a_starter_that_already_passes() {
        let tmp = tempfile::tempdir().unwrap();
        let mut p = add_problem();
        p.starter = p.solution.clone();
        write_problem(tmp.path(), &p);
        let out = validator(tmp.path());
        assert_eq!(out.status.code(), Some(1));
        assert!(String::from_utf8_lossy(&out.stdout).contains("starter.py"));
    }

    // O conteúdo real do repositório precisa carregar sem nenhuma questão ignorada.
    #[test]
    fn repository_content_loads_cleanly() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("..").join("content");
        let loaded = load_all(&dir);
        assert!(loaded.warnings.is_empty(), "{:#?}", loaded.warnings);
        assert!(!loaded.problems.is_empty());
    }
}
