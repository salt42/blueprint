#	the def keyword;
#	is followed by the function’s name, then
#	the arguments of the function are given between brackets followed by a colon.
#	the function body ;
#	and return object for optionally returning values.
def test(x=2):
    print('in test function')
	return 3.1 + x
	def testInner(x=1):
		print('in test function')
		return 3.1 + x

class Student(object):
	def __init__(self, name):
		self.name = name
	def set_age(self, age):
		self.age = age
	def set_major(self, major):
		self.major = major
