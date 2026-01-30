import Employee from "../models/employee.model.js";
import EmployeeHistory from "../models/employee.history.model.js";

export const loginEmployee = async (email, password, deviceInfo) => {
    try {

        let employee = await Employee.findOne({ email }).select("+password");
        console.log(employee);
        if (!employee) {
            return "no-employee";
        }

        const isValid = await employee.comparePassword(password);
        if (!isValid) {
            return "invalid-password";
        }

        if (!employee.employeeHistory) {
            return "no-employee-history";
        }

        const employeeHistory = await EmployeeHistory.findById(employee.employeeHistory);
        if (!employeeHistory) {
            return "no-employee-history";
        }

        const now = new Date();
        employeeHistory.lastLoginAt = now;
        if (deviceInfo) {
            const device = employeeHistory.deviceHistory.find(device => device.hwId === deviceInfo.hwId);
            if (device) {
                device.ip = deviceInfo.ip;
                device.lastActiveAt = now;
                device.loggedInAt = now;
                device.loggedOutAt = null;
            } else {
                await employeeHistory.deviceHistory.push({
                    deviceName: deviceInfo.deviceName,
                    hwId: deviceInfo.hwId,
                    deviceType: deviceInfo.deviceType,
                    ip: deviceInfo.ip,
                    loggedInAt: now,
                    loggedOutAt: null,
                    lastActiveAt: now
                });
            }
        }
        await employeeHistory.save();
        console.log(employeeHistory);

        // console.log(await employee.populate("employeeHistory"));

        employee = employee.toObject();
        delete employee.password;

        return employee;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const registerEmployee = async (email, password) => {
    try {
        const ifEmployeeExists = await Employee.findOne({ email });

        if (ifEmployeeExists) {
            return "employee-exists";
        }

        const employee = await Employee.create({
            email,
            password,
            employeeHistory: await EmployeeHistory.create({
                employeeId: employee._id,
                lastLoginAt: new Date(),
                lastLogoutAt: null
            }),
            metadata: {
                designations: [],
                department: [],
                roles: [],
                customPermissions: []
            }
        });

        // console.log(await employee.populate("employeeHistory"));

        return employee;
    } catch (error) {
        console.error(error);
        return null;
    }
};

export const logoutEmployee = async (email, deviceInfo) => {
    try {
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return "no-employee";
        }

        if (!employee.employeeHistory) {
            return "no-employee-history";
        }

        const employeeHistory = await EmployeeHistory.findById(employee.employeeHistory);
        if (!employeeHistory) {
            return "no-employee-history";
        }

        const now = new Date();
        employeeHistory.lastLogoutAt = now;
        employeeHistory.lastActiveAt = now;
        if (deviceInfo) {
            const devices = employeeHistory.deviceHistory;
            const device = devices.find(device => device.hwId === deviceInfo.hwId);
            if (device) {
                device.ip = deviceInfo.ip;
                device.loggedOutAt = now;
                device.lastActiveAt = now;
            } else {
                await employeeHistory.deviceHistory.push({
                    deviceName: deviceInfo.deviceName,
                    hwId: deviceInfo.hwId,
                    deviceType: deviceInfo.deviceType,
                    ip: deviceInfo.ip,
                    loggedInAt: null,
                    loggedOutAt: now,
                    lastActiveAt: now
                });
            }
        }
        await employeeHistory.save();
        
        console.log(employee);
        console.log(employeeHistory);

        return "success";
    } catch (error) {
        console.error(error);
        return null;
    }
};

