# make all       - compiles test runner
# make run       - compiles and runs with default image (gen.jpeg)
# make test      - same as run, compiles and runs
# make clean     - removes compiled binaries

CXX = g++
CXXFLAGS = -std=c++17

all: simple_test

run: simple_test
	./simple_test

test: simple_test
	./simple_test

simple_test: main_simple.cpp learn.cpp
	$(CXX) $(CXXFLAGS) -o simple_test main_simple.cpp

clean:
	rm -f simple_test learn out.png out_simple.png
