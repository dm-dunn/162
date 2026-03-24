const Joi = require('joi');

function validate(schema) {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        next();
    };
}

const schemas = {
    register: Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
        color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional()
    }),

    login: Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required()
    }),

    createPick: Joi.object({
        gameId: Joi.number().integer().required(),
        pickType: Joi.string().valid('moneyline', 'spread').required(),
        pickedTeam: Joi.string().valid('home', 'away').required()
    }),

    submitAllPicks: Joi.object({
        picks: Joi.array().items(
            Joi.object({
                gameId: Joi.number().integer().required(),
                pickType: Joi.string().valid('moneyline', 'spread').required(),
                pickedTeam: Joi.string().valid('home', 'away').required()
            })
        ).min(1).required()
    }),

    createLeague: Joi.object({
        name: Joi.string().min(3).max(100).required(),
        description: Joi.string().max(500).optional().allow('')
    }),

    inviteToLeague: Joi.object({
        emails: Joi.array().items(
            Joi.string().email()
        ).min(1).max(10).required()
    })
};

module.exports = {
    validate,
    schemas
};