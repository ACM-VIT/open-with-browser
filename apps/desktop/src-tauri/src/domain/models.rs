use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Serialize, Deserialize, Debug)]
pub struct Rule {
    pub id: Uuid,
    pub rule_name: String,
    pub priority: i32,
    pub conditions: Vec<Condition>,
    pub action: Action,
    pub enabled: bool,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Condition {
    pub fact: String,
    pub operator: String,
    pub value: String 
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Action {
    pub profile: String,
    pub browser: String,
    pub url: String
}

