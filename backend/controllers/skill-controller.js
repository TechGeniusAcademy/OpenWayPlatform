const fs = require('fs');
const path = require('path');

/**
 * SkillController manages player skills, progression, and effects
 */
class SkillController {
    constructor() {
        this.skills = new Map();
        this.playerSkills = new Map(); // userId -> Map<skillId, level>
        this.loadSkills();
    }

    /**
     * Load all skill definitions from JSON files
     */
    loadSkills() {
        const skillsDir = path.join(__dirname, '../data/skills');
        
        if (!fs.existsSync(skillsDir)) {
            console.warn('Skills directory not found:', skillsDir);
            return;
        }

        const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.json'));
        
        for (const file of files) {
            try {
                const skillData = JSON.parse(
                    fs.readFileSync(path.join(skillsDir, file), 'utf8')
                );
                this.skills.set(skillData.id, skillData);
                console.log(`[SkillController] Loaded skill: ${skillData.name} (${skillData.id})`);
            } catch (error) {
                console.error(`[SkillController] Error loading skill ${file}:`, error.message);
            }
        }
    }

    /**
     * Initialize player skills from database
     * @param {number} userId 
     * @param {Object} skillsData - Object with skillId: level pairs
     */
    initializePlayerSkills(userId, skillsData = {}) {
        const userSkills = new Map();
        
        for (const [skillId, level] of Object.entries(skillsData)) {
            if (this.skills.has(skillId)) {
                userSkills.set(skillId, level);
            }
        }
        
        this.playerSkills.set(userId, userSkills);
    }

    /**
     * Get player's skill level
     * @param {number} userId 
     * @param {string} skillId 
     * @returns {number} Skill level (0 if not learned)
     */
    getSkillLevel(userId, skillId) {
        const userSkills = this.playerSkills.get(userId);
        if (!userSkills) return 0;
        return userSkills.get(skillId) || 0;
    }

    /**
     * Get skill data by ID
     * @param {string} skillId 
     * @returns {Object|null}
     */
    getSkill(skillId) {
        return this.skills.get(skillId) || null;
    }

    /**
     * Get skill stats for specific level
     * @param {string} skillId 
     * @param {number} level 
     * @returns {Object|null}
     */
    getSkillStats(skillId, level) {
        const skill = this.getSkill(skillId);
        if (!skill || !skill.levels[level]) return null;
        return skill.levels[level];
    }

    /**
     * Apply sword slash passive effect when player attacks
     * @param {Object} attacker - Player object
     * @param {Object} target - Primary target
     * @param {number} damage - Original damage dealt
     * @param {Function} getNearbyEntities - Function to get entities in radius
     * @param {Function} dealDamage - Function to deal damage to entity
     */
    applySwordSlash(attacker, target, damage, getNearbyEntities, dealDamage) {
        const skillLevel = this.getSkillLevel(attacker.id, 'sword_slash');
        
        if (skillLevel === 0) return;

        const stats = this.getSkillStats('sword_slash', skillLevel);
        if (!stats) return;

        // Get all entities within splash radius
        const nearbyEntities = getNearbyEntities(target.x, target.y, stats.splashRadius);
        
        // Calculate splash damage
        const splashDamage = Math.floor(damage * (stats.splashDamagePercent / 100));

        // Apply damage to all nearby enemies except the primary target
        for (const entity of nearbyEntities) {
            if (entity.id === target.id) continue; // Skip primary target
            if (entity.type !== 'mob') continue; // Only damage mobs
            if (!entity.isAlive || entity.dead) continue; // Skip dead entities

            // Deal splash damage
            dealDamage(entity, splashDamage, {
                source: attacker,
                type: 'splash',
                skillId: 'sword_slash'
            });
        }

        // Log for debugging
        if (nearbyEntities.length > 1) {
            console.log(
                `[SwordSlash] Player ${attacker.username} dealt ${splashDamage} splash damage ` +
                `to ${nearbyEntities.length - 1} enemies (Lvl ${skillLevel}, Radius: ${stats.splashRadius})`
            );
        }
    }

    /**
     * Upgrade skill level (for future use with skill tree UI)
     * @param {number} userId 
     * @param {string} skillId 
     * @returns {boolean} Success
     */
    upgradeSkill(userId, skillId) {
        const skill = this.getSkill(skillId);
        if (!skill) return false;

        let userSkills = this.playerSkills.get(userId);
        if (!userSkills) {
            userSkills = new Map();
            this.playerSkills.set(userId, userSkills);
        }

        const currentLevel = userSkills.get(skillId) || 0;
        
        if (currentLevel >= skill.maxLevel) {
            return false; // Already max level
        }

        // Check requirements
        if (skill.requires && skill.requires.length > 0) {
            for (const reqId of skill.requires) {
                const reqLevel = this.getSkillLevel(userId, reqId);
                if (reqLevel === 0) {
                    return false; // Requirement not met
                }
            }
        }

        // Upgrade skill
        userSkills.set(skillId, currentLevel + 1);
        return true;
    }

    /**
     * Get all player skills as object (for saving to database)
     * @param {number} userId 
     * @returns {Object}
     */
    getPlayerSkillsData(userId) {
        const userSkills = this.playerSkills.get(userId);
        if (!userSkills) return {};

        const data = {};
        for (const [skillId, level] of userSkills.entries()) {
            data[skillId] = level;
        }
        return data;
    }
}

module.exports = new SkillController();
