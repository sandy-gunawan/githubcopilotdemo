# A Python class that validates phone numbers.

# function to validate phone numbers and to return a true or false value
class PhoneNumberValidator:
    def __init__(self, phone_number):
        self.phone_number = phone_number

    def is_valid(self):
        import re
        pattern = re.compile(r'^\+?1?\d{9,15}$')
        return bool(pattern.match(self.phone_number)


# fungsi untuk validasi password sesuai dengan best practise
class PasswordValidator:
    def __init__(self, password):
        self.password = password

    def is_valid(self):
        import re
        pattern = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$')
        return bool(pattern.match(self.password))