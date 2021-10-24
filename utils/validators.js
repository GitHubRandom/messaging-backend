module.exports = {
    validateWithMaxLength: (input, length) => input && input.length <= length,
    validateWithMinLength: (input, length) => input && input.length >= length,
    validateEmail: email => {
        const emailRegEx = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        return !!email.match(emailRegEx)
    },
    validatePassword: password => password.length >= 8 && password.length <= 300
}